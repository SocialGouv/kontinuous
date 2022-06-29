const camelCase = require("lodash.camelcase")

module.exports = (key) => {
  key = key.replace(/^(\d+-)/, "")
  key = camelCase(key)
  return key
}
