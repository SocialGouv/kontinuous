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
  configDirs = [],
  configCompilers = [],
  configOverride,
  env = process.env,
  options,
  mergeWith = deepmerge,
  emptyAsUndefined: defaultEmptyAsUndefined = false,
  rootConfig: config = {},
}) => {
  const extendsConfig = (src = {}) => {
    mergeWith(config, src)
  }
  for (const dir of configDirs) {
    extendsConfig(await getConfigYaml(`${dir}/${configBasename}.yaml`))
    extendsConfig(await getConfigYaml(`${dir}/${configBasename}.yml`))
  }
  for (const configCompiler of configCompilers) {
    await configCompiler(config)
  }

  const optionKeys = Object.keys(options)
  const envKeys = Object.keys(env)

  for (const [key, def] of Object.entries(configOverride)) {
    const {
      env: envKey,
      envParser,
      default: defaultValue,
      defaultFunction,
      emptyAsUndefined = defaultEmptyAsUndefined,
    } = def

    const optionKey = camelCase(def.option)

    const isUndefined = emptyAsUndefined
      ? emptyAsUndefinedCheck
      : undefinedCheck

    if (envKey && envKeys.includes(envKey) && !isUndefined(env[envKey])) {
      let envValue = env[envKey]
      if (envParser) {
        envValue = envParser(envValue)
      }
      config[key] = envValue
    }
    if (
      optionKey &&
      optionKeys.includes(optionKey) &&
      !isUndefined(options[optionKey])
    ) {
      config[key] = options[optionKey]
    }
    if (defaultFunction && isUndefined(config[key])) {
      config[key] = await defaultFunction(config, { options, env })
    }
    if (defaultValue && isUndefined(config[key])) {
      config[key] = defaultValue
    }
  }

  return config
}
