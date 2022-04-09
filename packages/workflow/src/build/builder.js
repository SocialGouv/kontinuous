const os = require("os")
const path = require("path")
const { mkdtemp } = require("fs/promises")
const fs = require("fs-extra")
const yaml = require("js-yaml")
const deepmerge = require("~/utils/deepmerge")

const asyncShell = require("~/utils/async-shell")
const globalLogger = require("~/utils/logger")
const getDirectories = require("~/utils/get-directories")

const getEnv = require("~/env")
const setDefaultValues = require("./values")
const compileJobs = require("./compile-jobs")
const compileOutputs = require("./compile-outputs")
const compileChart = require("./compile-chart")
const compilePatches = require("./compile-patches")
const loadManifests = require("./load-manifests")
const validateManifests = require("./validate-manifests")
const outputInfos = require("./output-infos")
const getYamlPath = require("~/utils/get-yaml-path")
const loadYamlFile = require("~/utils/load-yaml-file")

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
    KW_CHARTS,
    KW_SUBCHARTS,
    HELM_ARGS = "",
  } = envVars

  const logger = globalLogger.child({ KWBUILD_PATH, WORKSPACE_PATH })
  buildCtx.set("logger", logger)
  asyncShell.ctx.set("logger", logger)

  await fs.ensureDir(KWBUILD_PATH)

  logger.debug("Import kube-workflow charts and patches")
  await Promise.all([
    fs.copy(`${KUBEWORKFLOW_PATH}/Chart.yaml`, `${KWBUILD_PATH}/Chart.yaml`),
    fs.copy(`${KUBEWORKFLOW_PATH}/values.yaml`, `${KWBUILD_PATH}/values.yaml`),
    ...(KW_CHARTS ? [] : [fs.copy(`${KUBEWORKFLOW_PATH}/templates`, `${KWBUILD_PATH}/templates`)]),
    fs.copy(`${KUBEWORKFLOW_PATH}/charts`, `${KWBUILD_PATH}/charts`),
    fs.symlink(`${KUBEWORKFLOW_PATH}/patches`, `${KWBUILD_PATH}/patches`),
    fs.symlink(`${KUBEWORKFLOW_PATH}/validators`, `${KWBUILD_PATH}/validators`),
  ])

  const workspaceKubeworkflowPath = `${WORKSPACE_PATH}${WORKSPACE_SUBPATH}`
  const buildKubeworkflowPath = `${KWBUILD_PATH}/.kube-workflow`
  if (await fs.pathExists(workspaceKubeworkflowPath)) {
    await fs.symlink(workspaceKubeworkflowPath, buildKubeworkflowPath)
  }

  logger.debug("Prepare .kube-workflow package")
  if (
    await fs.pathExists(`${workspaceKubeworkflowPath}/package.json`) &&
    !await fs.pathExists(`${workspaceKubeworkflowPath}/node_modules`) &&
    !await fs.pathExists(`${workspaceKubeworkflowPath}/.pnp.cjs`)
  ) {
    await asyncShell("yarn", { cwd: workspaceKubeworkflowPath }, (proc) => {
      proc.stdout.pipe(process.stdout)
      proc.stderr.pipe(process.stderr)
    })
  }

  logger.debug("Generate values")
  const [commonValues, envValues] = await Promise.all([
    loadYamlFile(`${buildKubeworkflowPath}/values`, `${buildKubeworkflowPath}/common/values`),
    loadYamlFile(`${buildKubeworkflowPath}/${ENVIRONMENT}/values`, `${buildKubeworkflowPath}/env/${ENVIRONMENT}/values`),
  ])
  let values = deepmerge(commonValues, envValues)
  values = setDefaultValues(values)
  projectValuesJsFile = `${buildKubeworkflowPath}/values.js`
  if (await fs.pathExists(projectValuesJsFile)){
    values = require(projectValuesJsFile)(values)
  }

  logger.debug("Compiling jobs")
  await compileJobs(values)

  logger.debug("Compiling outputs")
  await compileOutputs(values)

  logger.debug("Merge project charts")
  const chartsDir = `${buildKubeworkflowPath}/charts`
  if (await fs.pathExists(chartsDir)) {
    await fs.copy(chartsDir, `${KWBUILD_PATH}/charts`, {
      dereference: true,
    })
  }
  if (!KW_CHARTS){
    logger.debug("Merge project templates")
    for (const dir of [
      "templates",
      "common/templates", // deprecated, retrocompat
      `${ENVIRONMENT}/templates`,
      `env/${ENVIRONMENT}/templates`, // deprecated, retrocompat
    ]) {
      const templatesDir = `${buildKubeworkflowPath}/${dir}`
      if (await fs.pathExists(templatesDir)) {
        await fs.copy(templatesDir, `${KWBUILD_PATH}/templates/project/${dir}`, {
          dereference: true,
        })
      }
    }
  }

  logger.debug("Compiling chart and subcharts")
  const chart = await compileChart(values)
  
  const chartNames = await getDirectories(`${KWBUILD_PATH}/charts`)
  logger.debug("Merge env templates in charts")
  for (const chartName of chartNames){
    const chartDir = `${KWBUILD_PATH}/charts/${chartName}`
    const envChartDir = `${chartDir}/${ENVIRONMENT}`
    const envChartTemplatesDir = `${envChartDir}/templates`
    if (await fs.pathExists(envChartTemplatesDir)){
      await fs.copy(envChartTemplatesDir, `${KWBUILD_PATH}/charts/${chartName}/templates/env`, {
        dereference: true
      })
    }
    const envValues = await loadYamlFile(`${envChartDir}/values`)
    if (envValues){
      let valuesObj = await loadYamlFile(`${chartDir}/values`)
      valuesObj = deepmerge(valuesObj || {}, envValues)
      const valuesFile = await getYamlPath(`${chartDir}/values`)
      await fs.writeFile(valuesFile, yaml.dump(valuesObj))
    }
  }

  if (KW_CHARTS) {
    logger.debug(`Enable only standalone charts: "${KW_CHARTS}"`)
    const enableCharts = KW_CHARTS.split(",")
    for (const key of chart.dependencies.map(dep => dep.alias || dep.name)) {
      if (!values[key]) {
        values[key] = {}
      }
      values[key].enabled = enableCharts.includes(key)
    }
  }
  if (KW_SUBCHARTS) {
    logger.debug(`Enable only subcharts: "${KW_SUBCHARTS}"`)
    const enableSubcharts = KW_SUBCHARTS.split(",")
    for (const key of chart.dependencies.map(dep => dep.alias || dep.name)) {
      if (!values[key]) {
        values[key] = {}
      }
      values[key].enabled = enableSubcharts.includes(key)
    }
  }

  logger.debug("Write values file")
  await fs.writeFile(`${KWBUILD_PATH}/values.json`, JSON.stringify(values))

  logger.debug("Link workspace to charts")
  const filesPath = `${KWBUILD_PATH}/.kube-workflow/files`
  if (await fs.pathExists(filesPath)) {
    await Promise.all([
      fs.symlink(filesPath, `${KWBUILD_PATH}/files`),
      ...chartNames.map(chartName => {
        return fs.symlink(filesPath, `${KWBUILD_PATH}/charts/${chartName}/files`)
      })
    ])
  }

  logger.debug("Build base manifest using helm")
  let manifests = await asyncShell(
    `
      helm template
        -f values.json
        --post-renderer ${KUBEWORKFLOW_PATH}/bin/post-renderer
        ${HELM_ARGS}
        .
    `,
    { cwd: KWBUILD_PATH }
  )

  logger.debug("Load manifests")
  manifests = await loadManifests(manifests, values)

  logger.debug("Apply patches")
  manifests = await compilePatches(manifests, values)
  
  logger.debug("Validate manifests")
  await validateManifests(manifests, values)
  
  logger.debug("Display infos")
  await outputInfos(manifests, values)
  
  logger.debug("Build final output")
  manifests = manifests.map(manifest => yaml.dump(manifest)).join("---\n")

  logger.debug("Write manifests file")
  const manifestsFile = `${KWBUILD_PATH}/manifests.yaml`
  await fs.writeFile(manifestsFile, manifests)

  logger.debug(`Built manifests: ${manifestsFile}`)

  return {
    manifestsFile,
    manifests,
    values,
  }
}

module.exports = (envVars) => {
  buildCtx.provide()
  asyncShell.ctx.provide()
  return builder(envVars)
}