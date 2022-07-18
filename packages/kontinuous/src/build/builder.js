const fs = require("fs-extra")
const yaml = require("~common/utils/yaml")

const asyncShell = require("~common/utils/async-shell")
const globalLogger = require("~common/utils/logger")

const copyFilter = require("~/config/copy-filter")

const ctx = require("~/ctx")

const applyPatches = require("./apply-patches")
const loadManifests = require("./load-manifests")
const validateManifests = require("./validate-manifests")
const debugManifests = require("./debug-manifests")
const loadDependencies = require("./load-dependencies")

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

  if (await fs.pathExists(workspaceKsPath)) {
    await fs.copy(workspaceKsPath, buildProjectPath, {
      dereference: true,
      filter: copyFilter,
    })
  }

  logger.debug("Compile dependencies")
  const { values, valuesDump } = await loadDependencies(config, logger)

  logger.trace(`Values: \n${valuesDump}`)

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
  manifests = await loadManifests(manifests, config)

  logger.trace(`Manifests: \n${yaml.dump(manifests)}`)

  logger.debug("Apply patches")
  manifests = await applyPatches(manifests, values)

  // console.log(yaml.dump(values))
  // console.log(yaml.dump(manifests))
  // console.log(JSON.stringify(manifests, null, 2))

  logger.debug("Build final output")
  const manifestsDump = manifests
    .map((manifest) => yaml.dump(manifest))
    .join("---\n")

  logger.debug("Write manifests file")
  const manifestsFile = `${buildPath}/manifests.yaml`
  await fs.writeFile(manifestsFile, manifestsDump)

  logger.debug(`Built manifests: file://${manifestsFile}`)

  logger.debug("Validate manifests")
  await validateManifests(manifests, values)

  logger.debug("Debug manifests")
  await debugManifests(manifests, values)

  return {
    manifestsFile,
    manifests: manifestsDump,
    values,
  }
}
