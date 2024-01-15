const getChartNameTopParts = require("../lib/get-chart-name-top-parts")

/** @type {Kontinuous.Patch.Function} */
module.exports = (manifests, options, { utils, config }) => {
  const { kindIsWaitable } = utils
  for (const manifest of manifests) {
    const { kind, metadata } = manifest
    const annotations = metadata?.annotations
    if (!annotations || !kindIsWaitable(manifest)) {
      continue
    }
    if (!manifest.metadata) {
      manifest.metadata = {}
    }

    const chartPath = annotations["kontinuous/chartPath"]
    const { name } = metadata
    const chartName = chartPath.split(".").pop()

    // @ts-ignore TODO
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
