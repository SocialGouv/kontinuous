const ctx = require("~common/ctx")

const createContext = require("~/plugins/context")
const pluginFunction = require("~/plugins/context/function")

const ValidationError = require("./validation-error")

module.exports = async (manifests) => {
  const abortSignal = ctx.require("abortSignal")
  abortSignal.throwIfAborted()

  const config = ctx.require("config")
  if (config.noValidate || config.disableStep.includes("validators")) {
    return
  }
  const logger = ctx.require("logger")
  logger.info("🌀 [LIFECYCLE]: validators")
  const context = createContext({ type: "validators", ValidationError })
  const { buildProjectPath } = config
  try {
    await pluginFunction(`${buildProjectPath}/validators`)(
      manifests,
      {},
      context
    )
  } catch (err) {
    if (!(err instanceof ValidationError)) {
      err = new ValidationError(err.message)
    }
    throw err
  }
}
