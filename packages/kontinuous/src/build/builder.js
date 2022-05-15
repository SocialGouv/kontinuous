const fs = require("fs-extra")
const yaml = require("~common/utils/yaml")
const deepmerge = require("~common/utils/deepmerge")

const asyncShell = require("~common/utils/async-shell")
const globalLogger = require("~common/utils/logger")
const getDirectories = require("~common/utils/get-directories")

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

  
  const {chart, values} = await loadDependencies(config)

  // console.log(JSON.stringify(values, null, 2))


  process.exit()
  
  // values: inline
  if(config.inlineValues) {
    const inlineValues = yaml.load(config.inlineValues)
    values = deepmerge(values, inlineValues)
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
