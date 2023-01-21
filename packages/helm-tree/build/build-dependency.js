const chartTools = require("helm-tree/chart-tools")
const downloadRemoteRepository = require("helm-tree/dependencies/download-remote-repository")

const setRelativeLinkVersions = require("helm-tree/chart-tools/set-relative-link-versions")

module.exports = async ({ name, target, definition, cachePath, logger }) => {
  await chartTools.buildChartFile(target, name, definition)
  await downloadRemoteRepository({ target, definition, cachePath, logger })
  await setRelativeLinkVersions({ target, definition, logger })
}
