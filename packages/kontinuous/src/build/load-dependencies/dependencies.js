const installPackages = require("~/plugins/install-packages")
const buildDependencies = require("./build-dependencies")

module.exports = async (config, logger) => {
  await buildDependencies(config, logger)
  await installPackages(config)
}
