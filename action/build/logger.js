const pino = require("pino")
const pretty = require('pino-pretty')
const logger = pino(pretty())
if (process.env.DEBUG) {
  logger.level = pino.levels.values.debug
}
module.exports = logger