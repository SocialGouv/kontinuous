const get = require("lodash.get")
const set = require("lodash.set")

/**
 *
 * @param {Kontinuous.Manifest} manifest
 * @param {[string, any]} match
 * @returns boolean
 */
const isMatching = (manifest, match) => {
  if (!match) {
    return true
  }
  for (const [key, value] of Object.entries(match)) {
    // @ts-ignore
    if (manifest[key] !== value) {
      return false
    }
  }
  return true
}

const specialFlags = ["chart"]

/** @type {Kontinuous.Patch.Function} */
module.exports = (manifests, _options, { values }) => {
  for (const manifest of manifests) {
    const chartPath = manifest.metadata?.annotations?.["kontinuous/chartPath"]
    if (!chartPath) {
      continue
    }
    const chartPathParts = []
    for (const chartPathPart of chartPath.split(".")) {
      chartPathParts.push(chartPathPart)
      const currentChartPath = chartPathParts.join(".")
      const scopedValues = get(values, currentChartPath)
      if (!scopedValues) {
        continue
      }
      for (const key of Object.keys(scopedValues)) {
        if (!key.startsWith("~")) {
          continue
        }
        let value
        let match
        if (
          typeof scopedValues[key] === "object" &&
          scopedValues[key] !== null &&
          !Array.isArray(scopedValues[key])
        ) {
          value = scopedValues[key].value
          match = scopedValues[key].match
        } else {
          value = scopedValues[key]
        }
        if (!isMatching(manifest, match)) {
          continue
        }
        const jval = typeof value === "string" ? value : JSON.stringify(value)
        const flag = key.slice(1)
        if (key.startsWith("~.")) {
          set(manifest, key.slice(2), jval)
        } else if (!specialFlags.includes(flag)) {
          const pluginKey = `kontinuous/plugin.${flag}`
          if (manifest.metadata?.annotations?.[pluginKey]) {
            continue
          }

          set(manifest, `metadata.annotations.["${pluginKey}"]`, jval)
        }
      }
    }
  }
  return manifests
}
