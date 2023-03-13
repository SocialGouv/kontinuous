const fs = require("fs-extra")

const degitImproved = require("~common/utils/degit-improved")

const slug = require("~common/utils/slug")

module.exports = async ({ dependency, cachePath, logger }) => {
  const { version } = dependency
  let { degit: degitUri } = dependency

  degitUri = degitUri.replaceAll("@", "#")

  const archiveSlug = slug([dependency.name, version, degitUri])
  const cacheDir = `${cachePath}/${archiveSlug}.git`
  if (!(await fs.pathExists(cacheDir))) {
    logger.debug(`⬇️  downloading chart ${degitUri}`)
    await degitImproved(degitUri, cacheDir, {
      logger: logger.child({
        dependency,
      }),
    })
  }
  return cacheDir
}
