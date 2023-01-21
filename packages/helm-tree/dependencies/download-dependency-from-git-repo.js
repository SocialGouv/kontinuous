const fs = require("fs-extra")
const downloadGitChart = require("./download-git-chart")

module.exports = async ({ dependency, target, cachePath, logger }) => {
  if (dependency.repository) {
    throw new Error(
      `repository and degit variable are mutually exclusive for chart dependency: ${JSON.stringify(
        dependency,
        null,
        2
      )}`
    )
  }
  const cacheDir = await downloadGitChart({ dependency, cachePath, logger })

  const chartName = dependency.alias || dependency.name

  await fs.copy(cacheDir, `${target}/charts/${chartName}`)

  dependency.repository = `file://./charts/${chartName}`
  delete dependency.degit
}
