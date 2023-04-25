const findAliasOf = async (
  search,
  values,
  scope = ["project"],
  searchingSubkeys = []
) => {
  if (search.includes(".")) {
    searchingSubkeys = search.split(".")
    search = searchingSubkeys.shift()
  }
  const entries = Object.entries(values).filter(
    ([_, value]) => !!value?._isChartValues
  )
  for (const [k, value] of entries) {
    if (k === search) {
      const foundScope = [...scope, k]
      if (searchingSubkeys.length > 0) {
        return findAliasOf(
          searchingSubkeys.shift(),
          value,
          foundScope,
          searchingSubkeys
        )
      }
      return foundScope
    }
  }
  for (const [k, value] of entries) {
    const found = await findAliasOf(
      search,
      value,
      [...scope, k],
      searchingSubkeys
    )
    if (found) {
      return found
    }
  }
}

module.exports = async (values, _options, _context) => {
  for (const [key, val] of Object.entries(values)) {
    if (key === "global" || key === "project") {
      continue
    }
    let search
    if (val["~chart"]) {
      if (val["~chart"].slice(0, 1) === ".") {
        continue
      }
      search = val["~chart"]
    } else {
      search = key
    }
    const scope = await findAliasOf(search, values.project)
    if (scope) {
      val["~chart"] = scope.join(".")
      if (val.enabled !== false) {
        val[`~enabled`] = true
      }
    }
  }
  return values
}
