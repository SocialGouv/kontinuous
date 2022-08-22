const findAliasOf = async (
  search,
  values,
  searchByKey = false,
  scope = ["project"],
  searchingSubkeys = []
) => {
  if (search.includes(".")) {
    searchingSubkeys = search.split(".")
    search = searchingSubkeys.shift()
  }
  for (const k of Object.keys(values)) {
    const isChartValues = values[k]?._isChartValues
    if (!isChartValues) {
      continue
    }
    if (k === search || (searchByKey && search.startsWith(`${k}-`))) {
      const foundScope = [...scope, k]
      if (searchingSubkeys.length > 0) {
        return findAliasOf(
          searchingSubkeys.shift(),
          values[k],
          searchByKey,
          foundScope,
          searchingSubkeys
        )
      }
      return foundScope
    }
    const found = await findAliasOf(
      search,
      values[k],
      searchByKey,
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
    let searchByKey
    if (val._chart) {
      // retro-compat
      val["~chart"] = val._chart
    }
    if (val["~chart"]) {
      if (val["~chart"].slice(0, 1) === ".") {
        continue
      }
      search = val["~chart"]
      searchByKey = false
    } else {
      search = key
      searchByKey = true
    }
    const scope = await findAliasOf(search, values.project, searchByKey)
    if (scope) {
      val["~chart"] = scope.join(".")
    }
  }
  return values
}
