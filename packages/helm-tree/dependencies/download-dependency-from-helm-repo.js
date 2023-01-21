const fs = require("fs-extra")
const decompress = require("decompress")

const downloadHelmChart = require("./download-helm-chart")

module.exports = async ({ dependency, target, cachePath, logger }) => {
  const zfile = await downloadHelmChart({
    dependency,
    target,
    cachePath,
    logger,
  })

  await decompress(zfile, `${target}/charts`)

  let chartName = dependency.name
  if (dependency.alias) {
    chartName = dependency.alias
    await fs.rename(
      `${target}/charts/${dependency.name}`,
      `${target}/charts/${dependency.alias}`
    )
  }

  dependency.repository = `file://./charts/${chartName}`
}
