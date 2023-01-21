const recurseDependencies = require("helm-tree/dependencies/recurse")

const buildDependency = require("./build-dependency")

module.exports = async (config, logger) => {
  const cachePath = `${config.kontinuousHomeDir}/cache/charts`
  await recurseDependencies({
    config,
    logger,
    afterChildren: (params) => buildDependency({ ...params, cachePath }),
  })
}
