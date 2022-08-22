const dashInstances = (values, scope = []) => {
  for (const key of Object.keys(values)) {
    if (
      typeof values[key] !== "object" ||
      values[key] === null ||
      Array.isArray(values[key])
    ) {
      continue
    }
    dashInstances(values[key], [...scope, key])
    for (const k of Object.keys(values)) {
      if (
        typeof values[k] !== "object" ||
        values[k] === null ||
        Array.isArray(values[key]) ||
        !values[k]._isProjectValues
      ) {
        continue
      }
      if (k.startsWith(`${key}-`) && !values[k]["~chart"]) {
        values[k]["~chart"] = `.${key}`
      }
    }
  }
}

module.exports = (values, _options, _config) => {
  dashInstances(values)
  return values
}
