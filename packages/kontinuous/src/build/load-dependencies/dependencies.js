const ctx = require("~common/ctx")

const installPackages = require("~/plugins/install-packages")
const buildDependencies = require("./build-dependencies")

module.exports = async (config, logger) => {
  const abortSignal = ctx.require("abortSignal")
  abortSignal.throwIfAborted()

  logger.info("🌀 [LIFECYCLE]: dependencies")
  await buildDependencies(config, logger)
  await installPackages(config)
}
