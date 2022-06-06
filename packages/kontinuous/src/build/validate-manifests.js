const ctx = require("~/ctx")
const utils = require("~common/utils")

module.exports = async (manifests, values)=>{
  const config = ctx.require("config")
  const logger = ctx.require("logger")
  const context = {config, logger, utils, ctx}
  const {buildProjectPath} = config
  await require(`${buildProjectPath}/validators`)(manifests, values, {}, context)
}
