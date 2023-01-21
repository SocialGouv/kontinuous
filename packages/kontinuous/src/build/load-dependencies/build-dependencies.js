const recurseDependencies = require("helm-tree/dependencies/recurse")
const buildHelmTree = require("helm-tree/build")
const buildJsFile = require("~/plugins/build-js-file")

module.exports = async (config, logger) => {
  await buildHelmTree(config, logger)
  await recurseDependencies({
    config,
    afterChildren: async ({ target, definition }) => {
      await buildJsFile(target, "values-compilers", definition)
      await buildJsFile(target, "debug-manifests", definition)
      await buildJsFile(target, "patches", definition)
      await buildJsFile(target, "validators", definition)
    },
  })
}
