const pino = require("pino")
const pretty = require("pino-pretty")

module.exports = (options = {}) => {
  const logger = pino(
    pretty({
      translateTime: "yyyy-mm-dd HH:mm:ss",
      ignore: "pid,hostname",
      destination: 2,
      ...options,
    })
  )

  const configureDebug = (debug) => {
    if (debug && debug !== "0" && debug !== "false") {
      logger.level = pino.levels.values.debug
    }
  }

  configureDebug(process.env.KS_DEBUG || process.env.DEBUG)

  logger.configureDebug = configureDebug

  return logger
}
