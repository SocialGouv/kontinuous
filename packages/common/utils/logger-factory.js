const pino = require("pino")
const pretty = require("pino-pretty")
const SonicBoom = require("sonic-boom")

module.exports = (options = {}) => {
  const { destination = new SonicBoom({ fd: process.stderr.fd }) } = options

  const logger = pino(
    pretty({
      translateTime: "yyyy-mm-dd HH:mm:ss",
      ignore: "pid,hostname",
      destination,
      ...options,
    })
  )

  const configureDebug = (debug) => {
    if (
      debug &&
      debug !== "0" &&
      debug !== "false" &&
      pino.levels.values.debug < pino.levels.values[logger.level]
    ) {
      logger.level = pino.levels.values.debug
    }
  }

  if (process.env.KS_LOG_LEVEL) {
    const logLevel = process.env.KS_LOG_LEVEL
    const logLevels = Object.keys(pino.levels.values)
    if (!logLevels.includes(logLevel)) {
      throw new Error(
        `unkown logLevel "${logLevel}", expected one of: ${logLevels.join(",")}`
      )
    }
    const levelValue = pino.levels.values[logLevel]
    logger.level = levelValue
  }
  configureDebug(process.env.KS_DEBUG || process.env.DEBUG)

  logger.configureDebug = configureDebug

  logger.flushSync = () => destination.flushSync()

  return logger
}
