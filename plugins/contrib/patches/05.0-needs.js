const kindIsWaitable = require("../lib/kind-is-waitable")
const getChartNameTopParts = require("../lib/get-chart-name-top-parts")

module.exports = async (manifests, options, { config }) => {
  for (const manifest of manifests) {
    const { kind } = manifest
    if (!kindIsWaitable(kind, options.customWaitableKinds)) {
      continue
    }
    if (!manifest.metadata) {
      manifest.metadata = {}
    }
    const { metadata } = manifest
    if (!metadata.annotations) {
      metadata.annotations = {}
    }
    const { annotations } = metadata

    const chartPath = annotations["kontinuous/chartPath"]
    const { name } = metadata
    const chartName = chartPath.split(".").pop()

    const lowerKind = kind.toLowerCase()
    annotations["kontinuous/depname.full"] = `${chartPath}.${lowerKind}.${name}`
    annotations[
      "kontinuous/depname.chartResource"
    ] = `${chartName}.${lowerKind}.${name}`
    annotations["kontinuous/depname.chartName"] = chartName
    annotations["kontinuous/depname.chartPath"] = chartPath
    annotations["kontinuous/depname.resourcePath"] = `${lowerKind}.${name}`
    annotations["kontinuous/depname.resourceName"] = name

    const parts = getChartNameTopParts(chartPath, config.dependencies)
    if (parts.length > 0) {
      annotations["kontinuous/depname.chartNameTopFull"] = parts.join(".")
      ;[annotations["kontinuous/depname.chartNameTop"]] = parts
    }
  }

  return manifests
}
