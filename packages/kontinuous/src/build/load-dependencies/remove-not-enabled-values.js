const removeNotEnabledValues = (values) => {
  let hasEnabledValue
  for (const [key, val] of Object.entries(values)) {
    if (typeof val !== "object" || val === null) {
      continue
    }
    const childrenHasEnabledValue = removeNotEnabledValues(val)
    if (childrenHasEnabledValue && val.enabled !== false) {
      hasEnabledValue = true
      val.enabled = true
    }
    if (val._isChartValues && !val.enabled) {
      // delete values[key]
      values[key] = { enabled: false }
    }
  }
  return hasEnabledValue || (values._isChartValues && values.enabled)
}
module.exports = removeNotEnabledValues
