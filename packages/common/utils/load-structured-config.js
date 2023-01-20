const fs = require("fs-extra")
const camelCase = require("lodash.camelcase")

const yaml = require("./yaml")
const deepmerge = require("./deepmerge")

const getConfigYaml = async (file) => {
  if (!(await fs.pathExists(file))) {
    return
  }
  return yaml.load(await fs.readFile(file, { encoding: "utf-8" }))
}

const undefinedCheck = (val) => val === undefined
const emptyAsUndefinedCheck = (val) =>
  val === undefined || val === "" || val === null

module.exports = async ({
  configBasename = "config",
  inlineConfigs = [],
  configDirs = [],
  configPreCompilers = [],
  configOverride = {},
  env = process.env,
  options,
  mergeWith = deepmerge,
  emptyAsUndefined: defaultEmptyAsUndefined = false,
  rootConfig: config = {},
  configMeta = {},
}) => {
  const extendsConfig = (src = {}) => {
    mergeWith(config, src)
  }
  for (const dir of configDirs) {
    extendsConfig(await getConfigYaml(`${dir}/${configBasename}.yaml`))
    extendsConfig(await getConfigYaml(`${dir}/${configBasename}.yml`))
  }
  for (const inlineConfig of inlineConfigs) {
    extendsConfig(inlineConfig)
  }
  for (const configCompiler of configPreCompilers) {
    await configCompiler(config)
  }

  const optionKeys = Object.keys(options)
  const envKeys = Object.keys(env)

  for (const [key, def] of Object.entries(configOverride)) {
    if (!configMeta[key]) {
      configMeta[key] = {}
    }

    const {
      envParser,
      default: defaultValue,
      defaultFunction,
      emptyAsUndefined = defaultEmptyAsUndefined,
      transform,
      generate,
      sideEffect,
    } = def

    const optionKey =
      def.option && def.option.length > 1 ? camelCase(def.option) : def.option

    const isUndefined = emptyAsUndefined
      ? emptyAsUndefinedCheck
      : undefinedCheck

    let { env: lookupEnvKeys } = def
    if (lookupEnvKeys) {
      if (!Array.isArray(lookupEnvKeys)) {
        lookupEnvKeys = [lookupEnvKeys]
      }
      for (const envKey of lookupEnvKeys) {
        if (envKeys.includes(envKey) && !isUndefined(env[envKey])) {
          let envValue = env[envKey]
          if (envParser) {
            envValue = envParser(envValue)
          }
          config[key] = envValue
          break
        }
      }
    }

    if (
      optionKey &&
      optionKeys.includes(optionKey) &&
      !isUndefined(options[optionKey])
    ) {
      config[key] = options[optionKey]
    }
    if (
      defaultFunction &&
      (isUndefined(config[key]) || configMeta[key].isDefault)
    ) {
      config[key] = await defaultFunction(config, { options, env })
      configMeta[key].isDefault = true
    }
    if (
      defaultValue &&
      (isUndefined(config[key]) || configMeta[key].isDefault)
    ) {
      config[key] = defaultValue
      configMeta[key].isDefault = true
    }
    if (generate) {
      config[key] = await generate(config)
    }
    if (transform) {
      config[key] = await transform(config[key], config)
    }
    if (sideEffect) {
      await sideEffect(config[key], config)
    }
  }

  return config
}
