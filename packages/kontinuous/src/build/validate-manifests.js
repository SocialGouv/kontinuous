const ctx = require("~common/ctx")

const createContext = require("~/plugins/context")
const pluginFunction = require("~/plugins/context/function")

const ValidationError = require("./validation-error")

module.exports = async (manifests) => {
  const config = ctx.require("config")
  if (config.noValidate) {
    return
  }
  const logger = ctx.require("logger")
  logger.info("🌀 [LIFECYCLE]: validators")
  const context = createContext({ type: "validators", ValidationError })
  const { buildProjectPath } = config
  await pluginFunction(`${buildProjectPath}/validators`)(manifests, {}, context)
}
