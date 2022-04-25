const os = require("os")
const path = require("path")
const { mkdtemp } = require("fs/promises")
const fs = require("fs-extra")
const yaml = require("js-yaml")
const deepmerge = require("~common/utils/deepmerge")

const asyncShell = require("~common/utils/async-shell")
const globalLogger = require("~common/utils/logger")
const getDirectories = require("~common/utils/get-directories")

const setDefaultValues = require("./values")
const compileJobs = require("./compile-jobs")
const compileOutputs = require("./compile-outputs")
const compileChart = require("./compile-chart")
const compilePatches = require("./compile-patches")
const loadManifests = require("./load-manifests")
const validateManifests = require("./validate-manifests")
const outputInfos = require("./output-infos")
const loadYamlFile = require("~common/utils/load-yaml-file")
const getGitInfos = require("~/utils/get-git-infos")
const selectEnv = require("~/utils/select-env")

const { buildCtx } = require("./ctx")
const set = require("lodash.set")

const builder = async (envVars, options = {}) => {
  buildCtx.set("env", envVars)

  
  for (const requiredEnv of [
    "KW_KUBEWORKFLOW_PATH",
    "KW_WORKSPACE_PATH",
  ]) {
    if (!envVars[requiredEnv]) {
      throw new Error(`Missing mandatory var "${requiredEnv}"`)
    }
  }
  
  const { GIT_REF, GIT_TAGS, GIT_SHA, GIT_REPOSITORY } = await getGitInfos(envVars.KW_WORKSPACE_PATH, envVars, true)
  Object.assign(envVars, {
    KW_GIT_REF: GIT_REF,
    KW_GIT_TAGS: GIT_TAGS,
    KW_GIT_SHA: GIT_SHA,
    KW_GIT_REPOSITORY: GIT_REPOSITORY
  })
  
  if(!envVars.KW_ENVIRONMENT){
    envVars.KW_ENVIRONMENT = await selectEnv({ options, cwd: envVars.KW_WORKSPACE_PATH, env: envVars })
  }
  
  if(envVars.KW_WORKSPACE_SUBPATH===undefined){
    if(await fs.pathExists(".kube-workflow")){
      envVars.KW_WORKSPACE_SUBPATH = "/.kube-workflow"
    } else {
      envVars.KW_WORKSPACE_SUBPATH = "/.kw"
    }
  }


  envVars.KW_WORKSPACE_KW_PATH = path.join(envVars.KW_WORKSPACE_PATH, envVars.KW_WORKSPACE_SUBPATH)
  
  if (!envVars.KW_BUILD_PATH) {
    envVars.KW_BUILD_PATH = await mkdtemp(
      path.join(os.tmpdir(), `kube-workflow`)
    )
  }

  const {
    KW_BUILD_PATH,
    KW_KUBEWORKFLOW_PATH,
    KW_ENVIRONMENT,
    KW_WORKSPACE_PATH,
    KW_WORKSPACE_KW_PATH,
    KW_CHARTS,
    KW_SUBCHARTS,
    KW_INLINE_VALUES,
    KW_INLINE_SET,
    KW_HELM_ARGS = "",
  } = envVars

  const logger = globalLogger.child({ KW_BUILD_PATH, KW_WORKSPACE_PATH })
  buildCtx.set("logger", logger)

  await fs.ensureDir(KW_BUILD_PATH)

  logger.debug("Import kube-workflow charts and patches")
  await Promise.all([
    fs.copy(`${KW_KUBEWORKFLOW_PATH}/Chart.yaml`, `${KW_BUILD_PATH}/Chart.yaml`),
    fs.copy(`${KW_KUBEWORKFLOW_PATH}/values.yaml`, `${KW_BUILD_PATH}/values.yaml`),
    ...(KW_CHARTS ?
        [
          fs.copy(
            `${KW_KUBEWORKFLOW_PATH}/templates/namespace.yaml`,
            `${KW_BUILD_PATH}/templates/namespace.yaml`
          ),
          fs.copy(
            `${KW_KUBEWORKFLOW_PATH}/templates/helpers`,
            `${KW_BUILD_PATH}/templates/helpers`
          )
        ] :
        [
          fs.copy(`${KW_KUBEWORKFLOW_PATH}/templates`, `${KW_BUILD_PATH}/templates`)
        ]
    ),
    fs.copy(`${KW_KUBEWORKFLOW_PATH}/charts`, `${KW_BUILD_PATH}/charts`),
    fs.symlink(`${KW_KUBEWORKFLOW_PATH}/patches`, `${KW_BUILD_PATH}/patches`),
    fs.symlink(`${KW_KUBEWORKFLOW_PATH}/validators`, `${KW_BUILD_PATH}/validators`),
  ])

  const buildKubeworkflowPath = `${KW_BUILD_PATH}/.kw`
  if (await fs.pathExists(KW_WORKSPACE_KW_PATH)) {
    await fs.symlink(KW_WORKSPACE_KW_PATH, buildKubeworkflowPath)
  }

  logger.debug("Merge project charts")
  const chartsDir = `${buildKubeworkflowPath}/charts`
  if (await fs.pathExists(chartsDir)) {
    await fs.copy(chartsDir, `${KW_BUILD_PATH}/charts`, {
      dereference: true,
    })
  }

  const chartNames = await getDirectories(`${KW_BUILD_PATH}/charts`)
  logger.debug("Merge env templates and import values from charts")
  const chartsValues = {}
  for (const chartName of chartNames){
    const chartDir = `${KW_BUILD_PATH}/charts/${chartName}`
    const envChartDir = `${chartDir}/${KW_ENVIRONMENT}`
    const envChartTemplatesDir = `${envChartDir}/templates`
    let chartValues = await loadYamlFile(`${chartDir}/values`)
    if (await fs.pathExists(envChartTemplatesDir)){
      await fs.copy(envChartTemplatesDir, `${KW_BUILD_PATH}/charts/${chartName}/templates/env`, {
        dereference: true
      })
    }
    const envValues = await loadYamlFile(`${envChartDir}/values`)
    chartsValues[chartName] = deepmerge(chartValues || {}, envValues || {})
  }

  logger.debug("Prepare .kw package")
  if (
    await fs.pathExists(`${KW_WORKSPACE_KW_PATH}/package.json`) &&
    !await fs.pathExists(`${KW_WORKSPACE_KW_PATH}/node_modules`) &&
    !await fs.pathExists(`${KW_WORKSPACE_KW_PATH}/.pnp.cjs`)
  ) {
    await asyncShell("yarn", { cwd: KW_WORKSPACE_KW_PATH }, (proc) => {
      proc.stdout.pipe(process.stdout)
      proc.stderr.pipe(process.stderr)
    })
  }

  logger.debug("Generate values")
  const [commonValues, envValues] = await Promise.all([
    loadYamlFile(`${buildKubeworkflowPath}/values`, `${buildKubeworkflowPath}/common/values`),
    loadYamlFile(`${buildKubeworkflowPath}/${KW_ENVIRONMENT}/values`, `${buildKubeworkflowPath}/env/${KW_ENVIRONMENT}/values`),
  ])

  // values: values.yaml + $env/values.yaml
  let values = deepmerge(commonValues, envValues)
  
  // keep it before we merge all charts values
  const autoEnabledKeys = []
  for (const key of Object.keys(values)) {
    if (!Object.keys(values[key]).includes('enabled')) {
      autoEnabledKeys.push(key)
    }
  }
  
  // values: import defaults from charts
  values = deepmerge(chartsValues, values)
  
  // values: apply default values.js
  values = setDefaultValues(values)
  
  // values: inline
  if(KW_INLINE_VALUES) {
    const kwValues = yaml.load(KW_INLINE_VALUES)
    values = deepmerge(values, kwValues)
  }
  
  // values: apply project values.js
  projectValuesJsFile = `${buildKubeworkflowPath}/values.js`
  if (await fs.pathExists(projectValuesJsFile)){
    values = require(projectValuesJsFile)(values)
  }
  
  // values: auto enable user defined keys
  for (const key of autoEnabledKeys) {
    values[key].enabled = true
  }

  // values: env KW_INLINE_SET
  if(KW_INLINE_SET){
    const sets = yaml.load(KW_INLINE_SET)
    for(const [key, val] of Object.entries(sets)){
      set(values, key, val)
    }
  }

  // values: --set option
  if(options.set){
    for(const s of options.set){
      const index = s.indexOf("=");
      if(index===-1){
        logger.warn("bad format for --set option, expected: foo=bar")
        continue
      }
      const key = s.slice(0, index)
      const val = s.slice(index+1)
      set(values, key, val)
    }
  }
  
  logger.debug("Compiling jobs")
  await compileJobs(values)
  
  logger.debug("Compiling outputs")
  await compileOutputs(values)
  
  if (!KW_CHARTS){
    logger.debug("Merge project templates")
    for (const dir of [
      "templates",
      "common/templates", // deprecated, retrocompat
      `${KW_ENVIRONMENT}/templates`,
      `env/${KW_ENVIRONMENT}/templates`, // deprecated, retrocompat
    ]) {
      const templatesDir = `${buildKubeworkflowPath}/${dir}`
      if (await fs.pathExists(templatesDir)) {
        await fs.copy(templatesDir, `${KW_BUILD_PATH}/templates/project/${dir}`, {
          dereference: true,
        })
      }
    }
  }
  
  logger.debug("Compiling chart and subcharts")
  const chart = await compileChart(values)

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
  await fs.writeFile(`${KW_BUILD_PATH}/values.json`, JSON.stringify(values))

  logger.debug("Link workspace to charts")
  const filesPath = `${KW_BUILD_PATH}/.kw/files`
  if (await fs.pathExists(filesPath)) {
    await Promise.all([
      fs.symlink(filesPath, `${KW_BUILD_PATH}/files`),
      ...chartNames.map(chartName => {
        return fs.symlink(filesPath, `${KW_BUILD_PATH}/charts/${chartName}/files`)
      })
    ])
  }

  logger.debug("Build base manifest using helm")
  let manifests = await asyncShell(
    `
      helm template
        -f values.json
        --post-renderer ${KW_KUBEWORKFLOW_PATH}/bin/post-renderer
        ${KW_HELM_ARGS}
        .
    `,
    { cwd: KW_BUILD_PATH }
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
  const manifestsFile = `${KW_BUILD_PATH}/manifests.yaml`
  await fs.writeFile(manifestsFile, manifests)

  logger.debug(`Built manifests: ${manifestsFile}`)

  return {
    manifestsFile,
    manifests,
    values,
  }
}

module.exports = (envVars, options) => {
  buildCtx.provide()
  return builder(envVars, options)
}