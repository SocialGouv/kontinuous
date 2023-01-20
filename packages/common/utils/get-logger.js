const ctx = require("~common/ctx")
const createLogger = require("./direct-logger-factory")

module.exports = () => ctx.getDefault("logger") || createLogger()
