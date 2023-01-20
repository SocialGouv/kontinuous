const createDirectLogger = require("~common/utils/direct-logger-factory")
const loggerTransports = require("~common/utils/direct-logger-transports")
const sentry = require("~/sentry")

module.exports = () =>
  createDirectLogger({
    streams: loggerTransports([process.stderr, sentry.directLoggerTransport()]),
  })
