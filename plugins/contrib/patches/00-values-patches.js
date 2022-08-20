const get = require("lodash.get")
const set = require("lodash.set")

const isMatching = (manifest, match) => {
  if (!match) {
    return true
  }
  for (const [key, value] of Object.entries(match)) {
    if (manifest[key] !== value) {
      return false
    }
  }
  return true
}

module.exports = (manifests, _options, { values }) => {
  for (const manifest of manifests) {
    const chartPath = manifest.metadata?.annotations?.["kontinuous/chartPath"]
    if (!chartPath) {
      continue
    }
    const scopedValues = get(values, chartPath)
    for (const key of Object.keys(scopedValues)) {
      if (!key.startsWith("~")) {
        continue
      }
      let value
      let match
      if (typeof scopedValues[key] === "object" && scopedValues[key] !== null) {
        value = scopedValues[key].value
        match = scopedValues[key].match
      } else {
        value = scopedValues[key]
      }
      if (!isMatching(manifest, match)) {
        continue
      }
      const jval = JSON.stringify(value)
      if (key.startsWith("~.")) {
        set(manifest, key.slice(2), jval)
      } else {
        set(
          manifest,
          `metadata.annotations.["kontinuous/plugin.${key.slice(1)}"]`,
          jval
        )
      }
    }
  }
  return manifests
}
