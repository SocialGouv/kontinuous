const fs = require("fs-extra")
const yaml = require("~common/utils/yaml")

const asyncShell = require("~common/utils/async-shell")
const globalLogger = require("~common/utils/logger")

const compilePatches = require("./compile-patches")
const loadManifests = require("./load-manifests")
const validateManifests = require("./validate-manifests")
const outputInfos = require("./output-infos")
const loadDependencies = require("./load-dependencies")

const ctx = require("~/ctx")

module.exports = async (options = {}) => {
  const config = ctx.require("config")
  
  const {
    buildPath,
    buildProjectPath,
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
  
  logger.debug("Load and compile dependencies")
  const {chart, values} = await loadDependencies(config)

  
  logger.debug("Build helm dependencies")
  await asyncShell(
    `helm dependencies build --skip-refresh`,
    { cwd: buildPath }
  )
  logger.debug("Build base manifest using helm")
  
  logger.debug("Values: \n"+yaml.dump(values))
  
  let manifests = await asyncShell(
    `
    helm template
    -f values.yaml
    --post-renderer ${kontinuousPath}/bin/post-renderer
    ${config.helmArgs}
    .
    `,
    { cwd: buildPath }
    )
    
    
  logger.debug("Load manifests")
  manifests = await loadManifests(manifests, values)
  
  logger.debug("Manifests: \n"+yaml.dump(manifests))
  process.exit()

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
