const ctx = require("~common/ctx")
const createLogger = require("./direct-logger-factory")

/** @type {() => Kontinuous.Patch.Context["logger"]} */
module.exports = () => ctx.getDefault("logger") || createLogger()
