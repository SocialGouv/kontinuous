const dashInstances = (values, scope = []) => {
  if (typeof values !== "object" || values === null) {
    return
  }
  for (const key of Object.keys(values)) {
    dashInstances(values[key], [...scope, key])
    for (const k of Object.keys(values)) {
      if (k.startsWith(`${key}-`) && !values[k]._aliasOf) {
        values[k]._aliasOf = `.${key}`
      }
    }
  }
}

module.exports = (values, _config) => {
  dashInstances(values)
  return values
}
