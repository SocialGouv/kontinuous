const fs = require("fs-extra")
const dotenv = require("dotenv")
const flattenObject = require("./flatten-object")
const normalizeEnvKey = require("./normalize-env-key")
const yaml = require("./yaml")

const getConfigYaml = async (file) => {
  if (!(await fs.pathExists(file))) {
    return
  }
  const config = yaml.load(await fs.readFile(file, { encoding: "utf-8" }))
  return flattenObject(config, {
    glue: "_",
    keyTransform: normalizeEnvKey,
  })
}

const getConfigEnv = async (file) => {
  if (!(await fs.pathExists(file))) {
    return
  }

  const dotenvConfig = dotenv.parse(
    await fs.readFile(file, { encoding: "utf-8" })
  )

  return dotenvConfig
}

module.exports = async ({
  fileName = "config",
  envPrefix,
  dirs = [],
  assign = true,
}) => {
  const env = {}
  const extendsEnv = (src = {}) => {
    Object.assign(env, src)
  }
  for (const dir of dirs) {
    extendsEnv(await getConfigYaml(`${dir}/${fileName}.yaml`))
    extendsEnv(await getConfigYaml(`${dir}/${fileName}.yml`))
    extendsEnv(await getConfigEnv(`${dir}/${fileName}.env`))
  }

  const prefixedEnv = {}
  for (const key of Object.keys(env)) {
    prefixedEnv[`${envPrefix}${key}`] = env[key]
  }
  if (assign) {
    Object.assign(process.env, prefixedEnv)
  }
  return prefixedEnv
}
