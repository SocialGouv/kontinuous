const pino = require("pino")
const pretty = require("pino-pretty")

const logger = pino(
  pretty({
    translateTime: "yyyy-mm-dd HH:mm:ss",
    ignore: "pid,hostname",
  })
)

const configureDebug = (debug) => {
  if (debug && debug !== "0" && debug !== "false") {
    logger.level = pino.levels.values.debug
  }
}

configureDebug(process.env.DEBUG)

module.exports = logger
module.exports.configureDebug = configureDebug
