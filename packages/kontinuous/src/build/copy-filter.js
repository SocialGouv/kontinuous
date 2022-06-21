const ignoreYarnState = require("~common/utils/ignore-yarn-state")

module.exports = (src)=>{
  return ignoreYarnState(src)
}