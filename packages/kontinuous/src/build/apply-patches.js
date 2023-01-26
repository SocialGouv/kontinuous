const ctx = require("~common/ctx")

const createContext = require("~/plugins/context")
const pluginFunction = require("~/plugins/context/function")

module.exports = async (manifests, values) => {
  const abortSignal = ctx.require("abortSignal")
  abortSignal.throwIfAborted()

  const config = ctx.require("config")

  if (config.disableStep.includes("patches")) {
    return
  }

  const logger = ctx.require("logger")
  logger.info("🌀 [LIFECYCLE]: patches")

  const context = createContext({ type: "patches", values })
  const { buildProjectPath } = config
  manifests = await pluginFunction(`${buildProjectPath}/patches`)(
    manifests,
    {},
    context
  )
  return manifests
}
