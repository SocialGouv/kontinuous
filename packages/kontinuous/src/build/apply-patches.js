const ctx = require("~/ctx")
const utils = require("~common/utils")

const getOptions = require("./get-options")
const getScope = require("./get-scope")

module.exports = async (manifests, values)=>{
  const config = ctx.require("config")
  const logger = ctx.require("logger")
  const context = {config, logger, utils, ctx, values, getOptions, getScope}
  const {buildProjectPath} = config
  manifests = await require(`${buildProjectPath}/patches`)(manifests, {}, context)
  return manifests
}