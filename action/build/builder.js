const os = require("os")
const path = require("path")
const { mkdtemp } = require("fs/promises")
const fs = require("fs-extra")
const yaml = require("js-yaml")
const defautlsDeep = require("lodash.defaultsdeep")

const asyncShell = require("./utils/asyncShell")

const generateValues = require("./values")
const compileUses = require("./compile-uses")
const compileChart = require("./compile-chart")
const compiledefaultNs = require("./compile-default-ns")
const getEnv = require("./env")

const globalLogger = require("./utils/logger")

const { buildCtx } = require("./ctx")

const builder = async (envVars) => {
  if (!envVars) {
    envVars = getEnv()
  }
  buildCtx.set("env", envVars)

  for (const requiredEnv of [
    "KUBEWORKFLOW_PATH",
    "WORKSPACE_PATH",
    "ENVIRONMENT",
  ]) {
    if (!envVars[requiredEnv]) {
      throw new Error(`Missing mandatory var "${requiredEnv}"`)
    }
  }

  if (!envVars.KWBUILD_PATH) {
    envVars.KWBUILD_PATH = await mkdtemp(
      path.join(os.tmpdir(), `kube-workflow`)
    )
  }

  const {
    KWBUILD_PATH,
    KUBEWORKFLOW_PATH,
    ENVIRONMENT,
    WORKSPACE_PATH,
    WORKSPACE_SUBPATH = "/.kube-workflow",
    COMPONENTS,
    HELM_ARGS = "",
  } = envVars

  const logger = globalLogger.child({ KWBUILD_PATH, WORKSPACE_PATH })
  buildCtx.set("logger", logger)
  asyncShell.ctx.set("logger", logger)

  await fs.ensureDir(KWBUILD_PATH)

  logger.debug("Merge charts and overlays")
  await fs.copy(`${KUBEWORKFLOW_PATH}/chart`, KWBUILD_PATH)
  await Promise.all([
    fs.copy(`${KWBUILD_PATH}/env`, `${KWBUILD_PATH}/env.autodevops`),
    fs.copy(`${KWBUILD_PATH}/common`, `${KWBUILD_PATH}/common.autodevops`),
  ])
  const workspaceKubeworkflowPath = `${WORKSPACE_PATH}${WORKSPACE_SUBPATH}`
  if (await fs.pathExists(workspaceKubeworkflowPath)) {
    await fs.copy(workspaceKubeworkflowPath, KWBUILD_PATH, {
      dereference: true,
    })
  }

  logger.debug("Generate values file")
  const getValuesFile = async (file) => {
    for (const filePath of [
      `${KWBUILD_PATH}/${file}.yaml`,
      `${KWBUILD_PATH}/${file}.yml`,
    ]) {
      if (await fs.pathExists(filePath)) {
        return yaml.load(await fs.readFile(filePath, { encoding: "utf-8" }))
      }
    }
    return null
  }
  const defaultValues = generateValues()
  const [commonValues, envValues] = await Promise.all([
    getValuesFile("common/values"),
    getValuesFile(`env/${ENVIRONMENT}/values`),
  ])
  const values = defautlsDeep({}, envValues, commonValues, defaultValues)

  logger.debug("Compiling composite uses")
  await compileUses(values)

  logger.debug("Compiling additional subcharts instances")
  const chart = await compileChart(values)

  logger.debug("Merge .kube-workflow env templates")
  const envTemplatesDir = `${KWBUILD_PATH}/env/${ENVIRONMENT}/templates`
  if (await fs.pathExists(envTemplatesDir)) {
    await fs.copy(envTemplatesDir, `${KWBUILD_PATH}/templates`, {
      dereference: true,
    })
  }

  if (COMPONENTS) {
    const components = COMPONENTS.split(" ")
    for (const key of Object.keys(chart.dependencies)) {
      values[key].enabled = components.includes(key)
    }
  }

  logger.debug("Write values file")
  await fs.writeFile(`${KWBUILD_PATH}/values.json`, JSON.stringify(values))

  logger.debug("Build base manifest using helm")
  let baseManifests = await asyncShell(
    `helm template -f values.json ${HELM_ARGS} .`,
    { cwd: KWBUILD_PATH }
  )

  logger.debug("Set default namespace")
  baseManifests = await compiledefaultNs(baseManifests, values)

  logger.debug("Write base manifests file")
  await fs.writeFile(`${KWBUILD_PATH}/base/manifests.yaml`, baseManifests)

  logger.debug("Build final manifests using kustomize")
  const manifests = await asyncShell(
    `kustomize build --load-restrictor=LoadRestrictionsNone env/${ENVIRONMENT}`,
    { cwd: KWBUILD_PATH }
  )

  logger.debug(`Write final manifests file`)
  await fs.writeFile(`${KWBUILD_PATH}/manifests.yaml`, manifests)

  logger.debug(`Built manifests: ${KWBUILD_PATH}/manifests.yaml`)

  return manifests
}

module.exports = async (envVars) => {
  buildCtx.provide()
  asyncShell.ctx.provide()
  const manifests = await builder(envVars)
  return manifests
}
