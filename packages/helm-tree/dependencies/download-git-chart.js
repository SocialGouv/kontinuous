const degitImproved = require("~common/utils/degit-improved")

const slug = require("~common/utils/slug")

module.exports = async ({ dependency, cachePath, logger }) => {
  const { version } = dependency
  let { degit: degitUri } = dependency

  degitUri = degitUri.replaceAll("@", "#")

  const archiveSlug = slug([dependency.name, version, degitUri])
  const cacheDir = `${cachePath}/${archiveSlug}.git`
  logger.debug(`⬇️  downloading chart ${degitUri}`)
  await degitImproved(degitUri, cacheDir, {
    logger: logger.child({
      dependency,
    }),
  })
  return cacheDir
}
