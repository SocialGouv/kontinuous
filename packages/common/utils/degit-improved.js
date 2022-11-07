const retry = require("async-retry")
const degit = require("tiged")

const degitTagHasChanged = require("./degit-tag-has-changed")

const defaultLogger = require("./logger")

const subgroupRe = /[^{}]+(?=})/g

module.exports = async (
  uri,
  target,
  { logger = defaultLogger, cacheCheck = true, force }
) => {
  retry(
    async (bail) => {
      try {
        let cache
        logger.debug(`🗂️  degit "${uri}"`)
        if (cacheCheck) {
          const tagHasChanged = await degitTagHasChanged(uri)
          cache = !tagHasChanged
          if (tagHasChanged) {
            logger.debug({ degit: uri }, `♻️ tag has changed, renew cache`)
          }
        }
        let subgroup
        let subDirectory
        const extractParams = uri.match(subgroupRe)
        if (extractParams) {
          ;[subgroup] = extractParams
          const subgroupFull = `{${subgroup}}`
          const repoAndPath = uri.slice(
            uri.indexOf(subgroupFull) + subgroupFull.length + 1
          )
          const repoDir = repoAndPath.split("/")
          const repoName = repoDir.shift()
          const subgroupIndex = uri.indexOf(subgroupFull)
          subDirectory = repoDir.join("/")
          uri = `${uri.slice(0, subgroupIndex)}${subgroup}/${repoName}`
          logger.debug(
            { degit: uri },
            `🗂️  degit using subgroup "${subgroup}" and sub-directory "${subDirectory}"`
          )
        }

        await degit(uri, {
          cache,
          force,
          subgroup,
          verbose: true,
          "sub-directory": subDirectory,
        }).clone(target)
      } catch (error) {
        if (
          error.code === "COULD_NOT_DOWNLOAD" &&
          error.original?.code === "ECONNRESET"
        ) {
          throw error
        }
        logger.error({ error }, `Unable to degit job ${uri}`)
        bail(error)
      }
    },
    {
      retries: 2,
      factor: 1,
      minTimeout: 1000,
      maxTimeout: 3000,
    }
  )
}
