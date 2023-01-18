const installPackages = require("~/plugins/install-packages")
const buildDependencies = require("./build-dependencies")

module.exports = async (config, logger) => {
  logger.info("🌀 [LIFECYCLE]: dependencies")
  await buildDependencies(config, logger)
  await installPackages(config)
}
