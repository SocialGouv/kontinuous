const getChartNameTopParts = require("./get-chart-name-top-parts")

/**
 *
 * @param {Kontinuous.Manifest[]} manifests
 * @param {Kontinuous.PatchContext} context
 * @returns
 */
module.exports = (manifests, context) => {
  const { utils, config } = context
  const { kindIsRunnable } = utils

  /** @type {Record<string, any>} */
  const deps = {}
  for (const manifest of manifests) {
    const { kind, metadata } = manifest
    const annotations = metadata?.annotations

    if (!annotations || !kindIsRunnable(manifest)) {
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
    /** @type {string[]} */
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
        const parts = getChartNameTopParts(chartPath, config.dependencies)
        if (parts.length > 0) {
          keys.push(parts[0])
          if (parts.length > 1) {
            keys.push(parts.join("."))
          }
        }
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
