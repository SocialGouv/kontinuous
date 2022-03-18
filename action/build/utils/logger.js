const pino = require("pino")
const pretty = require('pino-pretty')
const logger = pino(pretty())
if (process.env.DEBUG && process.env.DEBUG !== "0" && process.env.DEBUG !== "false") {
  logger.level = pino.levels.values.debug
}
module.exports = logger