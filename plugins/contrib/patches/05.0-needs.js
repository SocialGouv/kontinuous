module.exports = async (manifests, _options, context) => {
  const { utils } = context
  const { kindIsRunnable } = utils
  for (const manifest of manifests) {
    const { kind, metadata } = manifest
    const annotations = metadata?.annotations
    if (!annotations || !kindIsRunnable(kind)) {
      continue
    }

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
  }

  return manifests
}
