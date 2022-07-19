const utils = require("~common/utils")
const ctx = require("~common/ctx")
const needBin = require("~/bin/need-bin")

const getOptions = require("./get-options")
const getScope = require("./get-scope")
const createRequire = require("./require")

module.exports = ({ type, ...extra }) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")
  const context = {
    config,
    logger,
    utils,
    needBin,
    ctx,
    getOptions,
    getScope,
    ...extra,
  }
  context.require = createRequire(type, context)
  return context
}
