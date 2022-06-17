const ctx = require("~/ctx")
const utils = require("~common/utils")

const getOptions = require("./get-options")
const getScope = require("./get-scope")

module.exports = (extra={})=>{
  const config = ctx.require("config")
  const logger = ctx.require("logger")
  return {config, logger, utils, ctx, getOptions, getScope, ...extra}
}