const ctx = require("~/ctx")

module.exports = async (manifests, values)=>{
  const config = ctx.require("config")
  const logger = ctx.require("logger")
  const context = {config, logger}
  const {buildProjectPath} = config
  manifests = await require(`${buildProjectPath}/patches`)(manifests, values, {}, context)
  return manifests
}