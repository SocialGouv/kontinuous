const runKinds = require("./run-kinds")

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
    let { name } = metadata
    if (annotations["kontinuous/needsName"]) {
      name = annotations["kontinuous/needsName"]
    }
    const chartName = chartPath.split(".").pop()
    const keys = [chartName, chartPath]
    const nameParts = name.split(".")
    while (nameParts.length > 0) {
      const lastPart = nameParts.pop()
      const n = [...nameParts, lastPart].join(".")
      keys.push(
        ...[
          `${chartPath}.${lowerKind}.${n}`,
          `${chartPath}.${n}`,
          `${chartName}.${lowerKind}.${n}`,
          `${chartName}.${n}`,
          `${lowerKind}.${n}`,
          n,
        ]
      )
    }

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
