const os = require("os")
const path = require("path")

const fs = require("fs-extra")
const retry = require("async-retry")
const degit = require("tiged")
const { lock } = require("cross-process-lock")

const degitTagHasChanged = require("./degit-tag-has-changed")
const normalizeDegitUri = require("./normalize-degit-uri")

const getLogger = require("./get-logger")

const subgroupRe = /[^{}]+(?=})/g

module.exports = async (
  uri,
  target,
  { logger = getLogger(), cacheCheck = true, force, ignoreNotEmpty = true }
) => {
  const degitDir = path.join(os.homedir(), ".degit")
  await fs.ensureDir(degitDir)
  const unlock = await lock(`${degitDir}/`, {
    lockTimeout: 120000,
  })

  const pre = uri
  uri = normalizeDegitUri(uri)
  console.log({ pre, uri, "pre===uri": pre === uri })

  try {
    await retry(
      async (bail) => {
        try {
          let cache
          logger.debug(`🗂️  degit "${uri}"`)
          if (cacheCheck) {
            const tagHasChanged = await degitTagHasChanged(uri)
            cache = !tagHasChanged
            if (tagHasChanged) {
              logger.debug({ degit: uri }, `♻️  tag has changed, renew cache`)
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

          console.log({ uri, subgroup, subDirectory })
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
          if (ignoreNotEmpty && error.code === "DEST_NOT_EMPTY") {
            return
          }
          if (error.code === "Z_BUF_ERROR" && error.tarCode === "TAR_ABORT") {
            await fs.remove(path.dirname(error.file))
            throw error
          }
          logger.error({ error, uri, target }, `unable to degit`)
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
  } finally {
    await unlock()
  }
}
