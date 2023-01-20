const ctx = require("~common/ctx")

const directLoggerParseKeyValues = require("~common/utils/direct-logger-parse-key-values")
const removeAllAnsiColors = require("~common/utils/remove-all-ansi-colors")

const getSentryLevel = (logLevel) => {
  switch (logLevel) {
    case "error":
    case "debug":
    case "info":
      return logLevel
    case "warn":
      return "warning"
    case "trace":
    default:
      return "log"
  }
}

module.exports =
  () =>
  (msg, { level }) => {
    const Sentry = ctx.get("sentry")
    if (!Sentry) {
      return
    }

    msg = removeAllAnsiColors(msg)
    const [message, data] = directLoggerParseKeyValues(msg)

    // console.log({ message, data })

    Sentry.addBreadcrumb({
      category: "console",
      level: getSentryLevel(level),
      message,
      data,
    })
  }
