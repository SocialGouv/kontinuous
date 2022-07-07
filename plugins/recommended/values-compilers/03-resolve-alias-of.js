const get = require("lodash.get")
const set = require("lodash.set")
const cloneDeep = require("lodash.clonedeep")

const resolveAliasOf = (values, context, rootValues = values, scope = []) => {
  const { utils, chartsAliasMap, defaultValuesCache } = context
  const { deepmerge } = utils
  for (const [key, val] of Object.entries(values)) {
    if (typeof val !== "object" || val === null) {
      continue
    }
    if (val._aliasOf) {
      const parentDotKey = [...scope, key].join(".")

      let aliasOf = val._aliasOf
      if (aliasOf.startsWith(".")) {
        aliasOf = `${scope.join(".")}${parentDotKey}`
      }

      const aliasScope = aliasOf.split(".")
      const adjacentChartAlias = aliasScope.pop()
      if (adjacentChartAlias !== key) {
        let aliasMap = chartsAliasMap.get(aliasScope)
        if (!aliasMap) {
          aliasMap = {}
          chartsAliasMap.set(aliasScope, aliasMap)
        }
        aliasMap[key] = adjacentChartAlias
      }

      const dotKey = `${aliasScope.join(".")}.${key}`

      const def = {}
      if (dotKey === aliasOf && !defaultValuesCache[aliasOf]) {
        defaultValuesCache[aliasOf] = cloneDeep(get(rootValues, aliasOf))
      }
      if (dotKey !== aliasOf) {
        const defaultValues =
          defaultValuesCache[aliasOf] || get(rootValues, aliasOf)
        deepmerge(def, cloneDeep(defaultValues))
      }
      const nestedVal = get(rootValues, dotKey) || {}
      set(rootValues, dotKey, def)
      deepmerge(def, nestedVal, val)
      delete values[key]
    } else {
      resolveAliasOf(values[key], context, rootValues, [...scope, key])
    }
  }
}

module.exports = async (values, _options, context) => {
  context = { ...context, defaultValuesCache: {} }
  resolveAliasOf(values, context)
  return values
}
