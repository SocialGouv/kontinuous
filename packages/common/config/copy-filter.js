const ignoreYarnState = require("../utils/ignore-yarn-state")

module.exports = (src) => {
  if (src.includes(".snapshots")) {
    return false
  }
  return ignoreYarnState(src)
}
