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
    if (debug && debug !== "0" && debug !== "false") {
      logger.level = pino.levels.values.debug
    }
  }

  configureDebug(process.env.KS_DEBUG || process.env.DEBUG)

  logger.configureDebug = configureDebug

  logger.flushSync = () => destination.flushSync()

  return logger
}
