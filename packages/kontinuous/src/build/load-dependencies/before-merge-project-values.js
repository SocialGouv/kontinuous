const cloneDeep = require("lodash.clonedeep")
const beforeMergeChartValues = require("./before-merge-chart-values")

module.exports = (values) => {
  beforeMergeChartValues(values)
  for (const [key, subValues] of Object.entries(values)) {
    if (key === "global") {
      continue
    }
    if (typeof subValues !== "object" || subValues === null) {
      continue
    }
    subValues._isProjectValues = true
    subValues._ProjectValues = cloneDeep(subValues)
  }
}
