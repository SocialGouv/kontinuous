const degitImproved = require("~common/utils/degit-improved")

const slug = require("~common/utils/slug")
const matchLinkRemap = require("~common/utils/match-link-remap")
const ctx = require("~common/ctx")

module.exports = async ({ dependency, cachePath, logger }) => {
  const config = ctx.getDefault("config") || {}

  const { version } = dependency
  let { degit: degitUri } = dependency
  degitUri = degitUri.replaceAll("@", "#")

  const { links = {}, remoteLinks = {} } = config

  const matchRemoteLink = matchLinkRemap(degitUri, remoteLinks)
  if (matchRemoteLink) {
    degitUri = matchRemoteLink
  }
  const matchLink = matchLinkRemap(degitUri, links)

  if (matchLink) {
    return matchLink
  }
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
