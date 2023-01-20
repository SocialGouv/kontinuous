const path = require("path")
const fs = require("fs-extra")
const rimraf = require("rimraf")

const getLogger = require("~common/utils/get-logger")

const ttl = 48 * 3600

module.exports = async () => {
  const logger = getLogger()
  const uploadsDir = "/artifacts"
  const files = await fs.readdir(uploadsDir)
  await Promise.allSettled(
    files.map(async (file) => {
      try {
        const stat = await fs.stat(path.join(uploadsDir, file))

        const now = new Date().getTime()
        const endTime = new Date(stat.ctime).getTime() + ttl * 1000
        if (now > endTime) {
          const filepath = path.join(uploadsDir, file)
          await new Promise((resolve, reject) => {
            rimraf(filepath, (err) => {
              if (err) {
                logger.error(err)
                reject(err)
                return
              }
              logger.info(`successfully deleted ${filepath}`)
              resolve()
            })
          })
        }
      } catch (err) {
        logger.warn(err)
      }
    })
  )
  logger.debug("artifacts cleaned")
}
