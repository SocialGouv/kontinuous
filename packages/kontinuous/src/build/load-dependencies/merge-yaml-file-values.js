const path = require("path")

const deepmerge = require("~common/utils/deepmerge")
const loadYamlFile = require("~common/utils/load-yaml-file")
const yamlExtends = require("~common/utils/yaml-extends")

const expandDotNotation = require("./expand-dot-notation")

module.exports = async (valuesFileBasename, subValues, beforeMerge) => {
  const val = (await loadYamlFile(valuesFileBasename)) || {}

  await yamlExtends({ dir: path.dirname(valuesFileBasename), values: val })

  beforeMerge(val)
  expandDotNotation(val)
  deepmerge(subValues, val)
}
