const loggerPinoFactory = require("./logger-pino-factory")
const directLogger = require("./logger-direct-logger-factory")

module.exports = (opts = {}) => {
  if (opts.sync) {
    return directLogger(opts)
  }
  return loggerPinoFactory(opts)
}
