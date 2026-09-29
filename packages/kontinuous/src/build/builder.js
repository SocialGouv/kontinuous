const fs = require("fs-extra")
const yaml = require("~common/utils/yaml")

const asyncShell = require("~common/utils/async-shell")
const needHelm = require("~common/utils/need-helm")

const copyFilter = require("~common/config/copy-filter")
const ctx = require("~common/ctx")
const needBin = require("~/lib/need-bin")

const applyPatches = require("./apply-patches")
const postRenderer = require("./post-renderer")
const loadManifests = require("./load-manifests")
const validateManifests = require("./validate-manifests")
const debugManifests = require("./debug-manifests")
const loadDependencies = require("./load-dependencies")

module.exports = async (_options = {}) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")

  logger.info("🌀 [LIFECYCLE]: pre-build")
  // TODO:

  const { buildPath, buildProjectPath, workspaceKsPath } = config

  if (await fs.pathExists(workspaceKsPath)) {
    await fs.copy(workspaceKsPath, buildProjectPath, {
      dereference: true,
      filter: copyFilter,
    })
  }

  await needBin(needHelm)

  const { values, valuesDump } = await loadDependencies(config, logger)

  logger.trace(`Values: \n${valuesDump}`)

  let manifests

  const abortSignal = ctx.require("abortSignal")
  abortSignal.throwIfAborted()

  logger.info("🌀 [LIFECYCLE]: helm template")
  try {
    manifests = await asyncShell(
      `helm template . --values=values.yaml ${config.helmArgs}`,
      { cwd: buildPath },
      null,
      logger,
      { ignoreErrors: ["found symbolic link"] }
    )
  } catch (err) {
    logger.error(`Build helm error : ${err.message}`, err)
    throw err
  }

  logger.debug("📖 loading manifests")
  try {
    manifests = await loadManifests(manifests, config)
  } catch (err) {
    logger.error("load manifests error", err)
    throw err
  }

  // logger.trace(`Manifests: \n${yaml.dump(manifests)}`)
  manifests = await applyPatches(manifests, values)

  manifests = await postRenderer(manifests)

  const manifestsDump = yaml.dumpAll(manifests)
  const manifestsFile = `${buildPath}/manifests.yaml`
  await fs.writeFile(manifestsFile, manifestsDump)

  logger.debug(`🏗️  built manifests: file://${manifestsFile} `)

  await validateManifests(manifests)

  await debugManifests(manifests, values)

  logger.info("🌀 [LIFECYCLE]: post-build")
  // TODO:

  return {
    manifestsFile,
    manifests: manifestsDump,
    values,
  }
}
