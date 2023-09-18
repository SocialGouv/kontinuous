const get = require("lodash.get")
const set = require("lodash.set")
const cloneDeep = require("lodash.clonedeep")

const resolveAliasOf = (values, context, rootValues = values, scope = []) => {
  const { utils, chartsAliasMap, defaultValuesCache } = context
  const { deepmerge } = utils
  for (const [key, val] of Object.entries(values)) {
    if (key.startsWith("_")) {
      continue
    }
    if (typeof val !== "object" || val === null || val["~chart"]) {
      continue
    }
    resolveAliasOf(values[key], context, rootValues, [...scope, key])
  }
  for (const [key, val] of Object.entries(values)) {
    if (key.startsWith("_")) {
      continue
    }
    if (typeof val !== "object" || val === null || !val["~chart"]) {
      continue
    }

    const parentDotKey = [...scope, key].join(".")

    let aliasOf = val["~chart"]
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
    let defaultValues
    if (dotKey !== aliasOf) {
      defaultValues = defaultValuesCache[aliasOf] || get(rootValues, aliasOf)
      deepmerge(def, cloneDeep(defaultValues))
    }
    const nestedVal = get(rootValues, dotKey) || {}
    set(rootValues, dotKey, def)
    deepmerge(def, nestedVal, val)
    if (def[`~enabled`] === true && nestedVal?.["~enabled"] !== false) {
      def.enabled = true
    }
    if (def[`~enabled`] !== undefined) {
      delete def[`~enabled`]
    }
    delete values[key]
  }
}

module.exports = async (values, _options, context) => {
  context = { ...context, defaultValuesCache: {} }
  resolveAliasOf(values, context)
  return values
}
