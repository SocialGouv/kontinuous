const fs = require("fs-extra")
const yaml = require("~common/utils/yaml")

const asyncShell = require("~common/utils/async-shell")
const globalLogger = require("~common/utils/logger")

const applyPatches = require("./apply-patches")
const loadManifests = require("./load-manifests")
const validateManifests = require("./validate-manifests")
const outputInfos = require("./output-infos")
const loadDependencies = require("./load-dependencies")

const ctx = require("~/ctx")

module.exports = async (_options = {}) => {
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
  const {values} = await loadDependencies(config, logger)

  logger.debug("Values: \n"+yaml.dump(values))

  logger.debug("Build base manifest using helm")
  let manifests = await asyncShell(
    `
    helm template
    .
    --values=values.yaml
    --post-renderer=${kontinuousPath}/bin/post-renderer
    ${config.helmArgs}
    `,
    { cwd: buildPath }
  )
    
    
  logger.debug("Load manifests")
  manifests = await loadManifests(manifests, values)
  
  logger.debug("Manifests: \n"+yaml.dump(manifests))
  
  logger.debug("Apply patches")
  manifests = await applyPatches(manifests, values)

  // console.log(yaml.dump(values))
  // console.log(yaml.dump(manifests))
  // console.log(JSON.stringify(manifests, null, 2))
  
  
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
