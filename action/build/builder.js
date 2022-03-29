const os = require("os")
const path = require("path")
const { mkdtemp } = require("fs/promises")
const fs = require("fs-extra")
const yaml = require("js-yaml")
const defautlsDeep = require("lodash.defaultsdeep")

const getDirectories = require("./utils/getDirectories")
const asyncShell = require("./utils/asyncShell")

const generateValues = require("./values")
const compileUses = require("./compile-uses")
const compileOutputs = require("./compile-outputs")
const compileChart = require("./compile-chart")
const compiledefaultNs = require("./compile-default-ns")
const getEnv = require("./env")

const globalLogger = require("./utils/logger")

const { buildCtx } = require("./ctx")

module.exports = async (envVars) => {
  buildCtx.provide()
  asyncShell.ctx.provide()

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

  logger.debug(`Add symlinks kube-workflow chart`)
  const charts = await getDirectories(`${KUBEWORKFLOW_PATH}/charts`)
  await fs.ensureDir(`${KUBEWORKFLOW_PATH}/charts/kube-workflow/charts`)
  await Promise.all(
    charts.map(async (chartName) => {
      if (chartName === "kube-workflow") {
        return
      }
      const dest = `${KUBEWORKFLOW_PATH}/charts/kube-workflow/charts/${chartName}`
      if (!(await fs.pathExists(dest))) {
        await fs.symlink(`../../${chartName}`, dest)
      }
    })
  )

  await fs.ensureDir(KWBUILD_PATH)

  logger.debug("Merge charts and overlays")
  await Promise.all([
    fs.copy(`${KUBEWORKFLOW_PATH}/base`, `${KWBUILD_PATH}/base`),
    fs.copy(`${KUBEWORKFLOW_PATH}/charts`, `${KWBUILD_PATH}/charts`),
    fs.copy(`${KUBEWORKFLOW_PATH}/common`, `${KWBUILD_PATH}/common`),
    fs.copy(`${KUBEWORKFLOW_PATH}/env`, `${KWBUILD_PATH}/env`),
  ])

  await Promise.all([
    fs.copy(`${KWBUILD_PATH}/env`, `${KWBUILD_PATH}/env.autodevops`),
    fs.copy(`${KWBUILD_PATH}/common`, `${KWBUILD_PATH}/common.autodevops`),
  ])
  const workspaceKubeworkflowPath = `${WORKSPACE_PATH}${WORKSPACE_SUBPATH}`
  if (await fs.pathExists(workspaceKubeworkflowPath)) {
    await fs.copy(`${workspaceKubeworkflowPath}`, `${KWBUILD_PATH}`, {
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

  logger.debug("Compiling outputs")
  await compileOutputs(values)

  logger.debug("Compiling additional subcharts instances")
  const chart = await compileChart(values)

  logger.debug("Merge .kube-workflow env templates")
  const envTemplatesDir = `${KWBUILD_PATH}/env/${ENVIRONMENT}/templates`
  if (await fs.pathExists(envTemplatesDir)) {
    await fs.copy(envTemplatesDir, `${KWBUILD_PATH}/templates`, {
      dereference: true,
    })
  }

  logger.debug(`Import template in kube-workflow chart`)
  if (await fs.pathExists(`${KWBUILD_PATH}/templates`)) {
    await fs.copy(
      `${KWBUILD_PATH}/templates`,
      `${KWBUILD_PATH}/charts/kube-workflow/templates`
    )
  }

  if (COMPONENTS) {
    logger.debug(`Enable only components: "${COMPONENTS}"`)
    const components = COMPONENTS.split(" ")
    for (const key of Object.keys(chart.dependencies)) {
      values[key].enabled = components.includes(key)
    }
  }

  logger.debug("Write values file")
  await fs.writeFile(`${KWBUILD_PATH}/values.json`, JSON.stringify(values))

  logger.debug("Build base manifest using helm")
  let baseManifests = await asyncShell(
    `helm template -f values.json ${HELM_ARGS} charts/kube-workflow`,
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
  const manifestsFile = `${KWBUILD_PATH}/manifests.yaml`
  await fs.writeFile(manifestsFile, manifests)

  logger.debug(`Built manifests: ${KWBUILD_PATH}/manifests.yaml`)

  return {
    manifestsFile,
    manifests,
    values,
  }
}
