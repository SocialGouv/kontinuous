const { Logger } = require("direct-logger")

module.exports = (opts = {}) => {
  const logger = Logger({
    formatter: "cli",
    formatterOptions: {
      displayLevel: false,
    },
    streams: Logger.levels.map((_level, _i) => process.stderr),
    ...opts,
  })

  if (process.env.F10S_LOG_LEVEL) {
    const level = process.env.F10S_LOG_LEVEL
    logger.setLevel(level)
  }

  const configureDebug = (debug) => {
    if (debug && debug !== "0" && debug !== "false") {
      logger.minLevel("debug")
    }
  }

  configureDebug(process.env.F10S_DEBUG || process.env.DEBUG)

  logger.configureDebug = configureDebug

  return logger
}
