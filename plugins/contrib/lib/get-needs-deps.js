module.exports = (manifests, context) => {
  const { utils } = context
  const { kindIsRunnable } = utils

  const deps = {}
  for (const manifest of manifests) {
    const { kind, metadata } = manifest
    const annotations = metadata?.annotations
    if (!annotations || !kindIsRunnable(kind)) {
      continue
    }
    const lowerKind = kind.toLowerCase()
    const chartPath = annotations["kontinuous/chartPath"]

    const names = []

    let { name } = metadata
    if (annotations["kontinuous/needsName"]) {
      name = annotations["kontinuous/needsName"]
    }
    names.push(name)

    if (annotations["kontinuous/needsNames"]) {
      names.push(...JSON.parse(annotations["kontinuous/needsNames"]))
    }

    const chartName = chartPath.split(".").pop()
    const keys = [chartName, chartPath]

    for (const nameItem of names) {
      const nameParts = nameItem.split(".")
      while (nameParts.length > 0) {
        const lastPart = nameParts.pop()
        let n = [...nameParts, lastPart].join(".")
        if (n.endsWith(".")) {
          n = n.slice(0, -1)
        }
        keys.push(
          `${chartPath}.${lowerKind}.${n}`,
          `${chartPath}.${n}`,
          `${chartName}.${lowerKind}.${n}`,
          `${chartName}.${n}`,
          `${lowerKind}.${n}`,
          n
        )
      }
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
