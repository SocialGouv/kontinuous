const get = require("lodash.get")
const set = require("lodash.set")
const deepmerge = require("./utils/deepmerge")

module.exports = (values, methods, config) => {
  const findScope = (
    key,
    dependencies = { project: { dependencies: config.dependencies } },
    subValues = values,
    scope = []
  ) => {
    for (const ck of Object.keys(dependencies)) {
      for (const vk of Object.keys(subValues[ck])) {
        if (key.startsWith(`${vk}-`)) {
          return [...scope, ck, key]
        }
        if (vk === key) {
          return [...scope, ck, vk]
        }
      }
      const found = findScope(
        key,
        dependencies[ck].dependencies || {},
        subValues[ck],
        [...scope, ck]
      )
      if (found) {
        return found
      }
    }
  }

  for (const [key, val] of Object.entries(values)) {
    if (key !== "global" && key !== "project") {
      const scope = findScope(key)
      if (scope) {
        const dotKey = scope.join(".")
        let nestedVal = get(values, dotKey)
        if (!nestedVal) {
          nestedVal = {}
          set(values, dotKey, nestedVal)
        }
        deepmerge(nestedVal, val)
        delete values[key]
      }
    }
  }
  return values
}
