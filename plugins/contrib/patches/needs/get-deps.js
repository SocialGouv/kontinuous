const runKinds = ["Deployment", "StatefulSet", "DaemonSet", "Job"]

module.exports = (manifests) => {
  const deps = {}
  for (const manifest of manifests) {
    const { kind, metadata } = manifest
    const annotations = metadata?.annotations
    if (!annotations || !runKinds.includes(kind)) {
      continue
    }
    const lowerKind = kind.toLowerCase()
    const chartPath = annotations["kontinuous/chartPath"]
    const { name } = metadata
    const chartName = chartPath.split(".").pop()
    const keys = [
      `${chartPath}.${lowerKind}.${name}`,
      `${chartName}.${lowerKind}.${name}`,
      chartName,
      chartPath,
      `${lowerKind}.${name}`,
      name,
    ]
    const stage = annotations["kontinuous/plugin.stage"]
    if (stage) {
      keys.push(stage)
    }
    for (const key of keys) {
      if (!deps[key]) {
        deps[key] = []
      }
      deps[key].push(manifest)
    }
  }
  return deps
}
