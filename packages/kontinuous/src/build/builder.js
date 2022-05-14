const fs = require("fs-extra")
const yaml = require("~common/utils/yaml")
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
const createChart = require("~common/utils/create-chart")
const loadDependencies = require("./load-dependencies")

const ctx = require("~/ctx")
const set = require("lodash.set")

module.exports = async (options = {}) => {
  const config = ctx.require("config")
  
  const {
    buildPath,
    buildProjectPath,
    environment,
    workspacePath,
    workspaceKsPath,
    kontinuousPath,
  } = config
  
  const logger = globalLogger.child({ buildPath, workspacePath })
  ctx.set("logger", logger)
  
  await fs.ensureDir(config.buildPath)
  
  
  if (await fs.pathExists(workspaceKsPath)) {
    await fs.copy(workspaceKsPath, buildProjectPath, {
      dereference: true,
      filter: (src)=>{
        if(src.includes("node_modules/")){
          return false
        }
        return true
      }
    })
  }

  const umbrellaChart = createChart("kontinuous-umbrella")
  const umbrellaValues = {}
  
  await loadDependencies(config)
  
  await Promise.all([
    fs.writeFile(`${buildPath}/Chart.yaml`, yaml.dump(umbrellaChart)),
    fs.writeFile(`${buildPath}/values.yaml`, yaml.dump(umbrellaValues)),
  ])

  process.exit()

  const chartNames = await getDirectories(`${buildPath}/charts`)
  logger.debug("Merge env templates and import values from charts")
  const chartsValues = {}
  for (const chartName of chartNames){
    const chartDir = `${buildPath}/charts/${chartName}`
    const envChartDir = `${chartDir}/${environment}`
    const envChartTemplatesDir = `${envChartDir}/templates`
    let chartValues = await loadYamlFile(`${chartDir}/values`)
    if (await fs.pathExists(envChartTemplatesDir)){
      await fs.copy(envChartTemplatesDir, `${buildPath}/charts/${chartName}/templates/env`, {
        dereference: true
      })
    }
    const envValues = await loadYamlFile(`${envChartDir}/values`)
    chartsValues[chartName] = deepmerge(chartValues || {}, envValues || {})
  }

  logger.debug("Prepare .kw package")
  if (
    await fs.pathExists(`${workspaceKsPath}/package.json`) &&
    !await fs.pathExists(`${workspaceKsPath}/node_modules`) &&
    !await fs.pathExists(`${workspaceKsPath}/.pnp.cjs`)
  ) {
    await asyncShell("yarn", { cwd: workspaceKsPath }, (proc) => {
      proc.stdout.pipe(process.stdout)
      proc.stderr.pipe(process.stderr)
    })
  }

  logger.debug("Generate values")
  const [commonValues, envValues] = await Promise.all([
    loadYamlFile(`${buildProjectPath}/values`, `${buildProjectPath}/common/values`),
    loadYamlFile(`${buildProjectPath}/${environment}/values`, `${buildProjectPath}/env/${environment}/values`),
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
  if(config.inlineValues) {
    const inlineValues = yaml.load(config.inlineValues)
    values = deepmerge(values, inlineValues)
  }
  
  // values: apply project values.js
  projectValuesJsFile = `${buildProjectPath}/values.js`
  if (await fs.pathExists(projectValuesJsFile)){
    values = require(projectValuesJsFile)(values)
  }
  
  // values: auto enable user defined keys
  for (const key of autoEnabledKeys) {
    values[key].enabled = true
  }

  // values: env KS_INLINE_SET
  if(config.inlineSet){
    const inlineSet = yaml.load(config.inlineSet)
    for(const [key, val] of Object.entries(inlineSet)){
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
  
  logger.debug("Compiling jobs outputs")
  await compileOutputs(values)
  
  if (!config.chart){
    logger.debug("Merge project templates")
    for (const dir of [
      "templates",
      "common/templates", // deprecated, retrocompat
      `${environment}/templates`,
      `env/${environment}/templates`, // deprecated, retrocompat
    ]) {
      const templatesDir = `${buildProjectPath}/${dir}`
      if (await fs.pathExists(templatesDir)) {
        await fs.copy(templatesDir, `${buildPath}/templates/project/${dir}`, {
          dereference: true,
        })
      }
    }
  }

  
  logger.debug("Compiling chart and subcharts")
  const chart = await compileChart(values)
  
  if (config.chart) {
    logger.debug(`Enable only standalone charts: "${config.chart}"`)
    const enableCharts = config.chart
    for (const key of chart.dependencies.map(dep => dep.alias || dep.name)) {
      if (!values[key]) {
        values[key] = {}
      }
      values[key].enabled = enableCharts.includes(key)
    }
  }
    
  logger.debug("Write values file")
  await fs.writeFile(`${buildPath}/values.json`, JSON.stringify(values))

  logger.debug("Link workspace to charts")
  const filesPath = `${buildPath}/.kw/files`
  if (await fs.pathExists(filesPath)) {
    await Promise.all([
      fs.symlink(filesPath, `${buildPath}/files`),
      ...chartNames.map(chartName => {
        return fs.symlink(filesPath, `${buildPath}/charts/${chartName}/files`)
      })
    ])
  }

  logger.debug("Build base manifest using helm")
  let manifests = await asyncShell(
    `
      helm template
        -f values.json
        --post-renderer ${kontinuousPath}/bin/post-renderer
        ${config.helmArgs}
        .
    `,
    { cwd: buildPath }
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
  const manifestsFile = `${buildPath}/manifests.yaml`
  await fs.writeFile(manifestsFile, manifests)

  logger.debug(`Built manifests: ${manifestsFile}`)

  return {
    manifestsFile,
    manifests,
    values,
  }
}
