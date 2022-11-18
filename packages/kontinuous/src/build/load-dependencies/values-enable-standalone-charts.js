const get = require("lodash.get")
const set = require("lodash.set")

module.exports = (values, config) => {
  const hasAll = !(config.chart && config.chart.length > 0)
  values.global.kontinuous.hasChart = !hasAll
  values.global.kontinuous.hasAll = hasAll
  if (hasAll) {
    return
  }
  values.global.kontinuous.chart = config.chart
  for (const [key, val] of Object.entries(values)) {
    if (key === "project" || key === "global") {
      continue
    }
    if (typeof values[key] !== "object" || values[key] === null) {
      continue
    }
    val.enabled = false
  }
  const enableCharts = config.chart
  for (const key of enableCharts) {
    let v = get(values, key)
    if (typeof v !== "object" || v === null) {
      v = {}
      set(values, key, v)
    }
    v.enabled = true
  }
}
