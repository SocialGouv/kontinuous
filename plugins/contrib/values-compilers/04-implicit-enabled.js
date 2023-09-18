const implicitEnabled = (values, scope = []) => {
  if (typeof values !== "object" || values === null) {
    return
  }
  if (values._isProjectValues && scope.length > 0) {
    if (values.enabled !== false) {
      values.enabled = true
    }
  }
  for (const key of Object.keys(values)) {
    if (key.startsWith("_")) {
      continue
    }
    implicitEnabled(values[key], [...scope, key])
  }
}

module.exports = (values, _options, _config) => {
  implicitEnabled(values)
  return values
}
