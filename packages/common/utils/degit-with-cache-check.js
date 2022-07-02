const degit = require("tiged")

const degitTagHasChanged = require("./degit-tag-has-changed")

const defaultLogger = require("./logger")

module.exports = async (uri, target, { logger = defaultLogger, force }) => {
  try {
    const tagHasChanged = await degitTagHasChanged(uri)
    const cache = !tagHasChanged
    logger.debug(`degit "${uri}"`)
    if (tagHasChanged) {
      logger.debug({ degit: uri }, `tag has changed, renew cache`)
    }
    await degit(uri, { cache, force }).clone(target)
  } catch (error) {
    logger.error({ error }, `Unable to degit job ${uri}`)
    throw error
  }
}
