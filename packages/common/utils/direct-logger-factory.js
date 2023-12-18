const Logger = require("direct-logger")

module.exports = (opts = {}) => {
  const { streams = process.stderr } = opts

  const logger = Logger({
    formatter: "cli",
    formatterOptions: {
      displayLevel: false,
    },
    streams,
    ...opts,
  })

  if (process.env.KS_LOG_LEVEL) {
    const level = process.env.KS_LOG_LEVEL
    logger.setLevel(level)
  }

  const debug = process.env.KS_DEBUG || process.env.DEBUG
  if (debug && debug !== "0" && debug !== "false") {
    logger.minLevel("debug")
  }

  return logger
}
