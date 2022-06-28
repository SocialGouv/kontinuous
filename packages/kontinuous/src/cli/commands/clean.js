const os = require("os")

const fs = require("fs-extra")

const logger = require("~common/utils/logger")
const ctx = require("~/ctx")

module.exports = (program) =>
  program
    .command("clean")
    .description("Clean temporary files")
    .option("--cache", "clean degit cache")
    .action(async (opts, _command) => {
      const config = ctx.require("config")

      const { buildRootPath } = config
      if (!buildRootPath || buildRootPath === "/") {
        throw new Error(`Unexpected buildRootPath: ${buildRootPath}`)
      }

      logger.info(`cleaning builds ${buildRootPath}`)
      try {
        await fs.remove(buildRootPath)
      } catch (error) {
        logger.error(error)
        process.exit(1)
      }

      const homeOrTmpDir = os.homedir || os.tmpdir
      if (opts.cache) {
        try {
          const cacheDirs = [
            `${homeOrTmpDir}/.kontinuous/cache`,
            `${homeOrTmpDir}/.degit`,
          ]
          await Promise.all(
            cacheDirs.map(async (cacheDir) => {
              logger.info(`cleaning cache ${cacheDir}`)
              await fs.remove(cacheDir)
            })
          )
        } catch (error) {
          logger.error(error)
          process.exit(1)
        }
      }

      logger.info("done")
    })
