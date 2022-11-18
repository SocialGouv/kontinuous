const deepmerge = require("~common/utils/deepmerge")
const loadYamlFile = require("~common/utils/load-yaml-file")

const expandDotNotation = require("./expand-dot-notation")

module.exports = async (valuesFileBasename, subValues, beforeMerge) => {
  const val = (await loadYamlFile(valuesFileBasename)) || {}
  beforeMerge(val)
  expandDotNotation(val)
  deepmerge(subValues, val)
}
