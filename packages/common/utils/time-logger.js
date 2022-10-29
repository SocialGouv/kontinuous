const prettyTime = require("./pretty-time")

function TimeLogger({
  startTime = new Date(),
  logger = console,
  label = "elapsed",
  logLevel = "debug",
} = {}) {
  this.startTime = startTime
  this.logger = logger
  this.label = label
  this.logLevel = logLevel
}
Object.assign(TimeLogger.prototype, {
  end(options = {}) {
    if (options.logger) {
      this.logger = options.logger
    }
    if (options.label) {
      this.label = options.label
    }
    if (options.logLevel) {
      this.logLevel = options.logLevel
    }
    this.logger[this.logLevel](
      `${this.label}: ${prettyTime(new Date() - this.startTime)}`
    )
  },
})

function createTimeLogger(params) {
  return new TimeLogger(params)
}

createTimeLogger.TimeLogger = TimeLogger

module.exports = createTimeLogger
