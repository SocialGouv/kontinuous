const os = require("os")

const fs = require("fs-extra")

const ctx = require("~common/ctx")

module.exports = (program) =>
  program
    .command("clean")
    .description("Clean temporary files")
    .option("--cache", "clean degit cache")
    .action(async (opts, _command) => {
      const config = ctx.require("config")
      const logger = ctx.require("logger")

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

      const homeOrTmpDir = os.homedir() || os.tmpdir()
      if (opts.cache) {
        try {
          const cacheDirs = [
            `${config.kontinuousHomeDir}/cache`,
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
