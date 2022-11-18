const recurseDependency = require("~common/config/recurse-dependencies")
const buildJsFile = require("~/plugins/build-js-file")

const chartTools = require("./chart-tools")
const downloadRemoteRepository = require("./download-remote-repository")
const setRelativeLinkVersions = require("./set-relative-link-versions")

module.exports = async (config, logger) => {
  await recurseDependency({
    config,
    afterChildren: async ({ name, target, definition }) => {
      await chartTools.buildChartFile(target, name, definition)
      await downloadRemoteRepository(target, definition, config, logger)
      await setRelativeLinkVersions(target, definition, config, logger)
      await buildJsFile(target, "values-compilers", definition)
      await buildJsFile(target, "debug-manifests", definition)
      await buildJsFile(target, "patches", definition)
      await buildJsFile(target, "validators", definition)
      // await buildJsFile(target, "pre-deploy", definition)
      // await buildJsFile(target, "post-deploy", definition)
    },
  })
}
