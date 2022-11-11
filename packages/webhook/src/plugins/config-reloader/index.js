const chokidar = require("chokidar")

const fs = require("fs-extra")

const { ctx } = require("@modjo-plugins/core")

const loadFinalConfig = require("~/config/load-final-config")

module.exports = async () => {
  const logger = ctx.require("logger")
  const config = ctx.require("config")

  const { reloadableSecretsRootPath } = config.project.paths
  if (!(await fs.pathExists(reloadableSecretsRootPath))) {
    return
  }

  const reloadConfig = async (_event) => {
    logger.info("secrets changes detected, reloading config...")
    await loadFinalConfig(config)
  }

  const shutdownHandlers = ctx.require("shutdownHandlers")

  const watcher = chokidar.watch(reloadableSecretsRootPath, {
    followSymlinks: true,
    usePolling: true,
    interval: 2000,
    binaryInterval: 3000,
    ignoreInitial: true,
  })

  watcher.on("all", reloadConfig)

  shutdownHandlers.push(async () => {
    await watcher.close()
  })
}
