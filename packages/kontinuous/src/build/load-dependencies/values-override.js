const set = require("lodash.set")

const yaml = require("~common/utils/yaml")
const deepmerge = require("~common/utils/deepmerge")

module.exports = (values, config, logger) => {
  if (config.inlineValues) {
    const inlineValues = yaml.load(config.inlineValues)
    values = deepmerge(values, inlineValues)
  }

  const setValues = config.set
  if (setValues) {
    if (Array.isArray(setValues)) {
      for (const s of setValues) {
        const index = s.indexOf("=")
        if (index === -1) {
          logger.warn("bad format for --set option, expected: foo=bar")
          continue
        }
        const key = s.slice(0, index)
        const val = s.slice(index + 1)
        set(values, `${key}`, yaml.parse(val))
      }
    } else {
      for (const [key, val] of Object.entries(setValues)) {
        set(values, key, val)
      }
    }
  }
}
