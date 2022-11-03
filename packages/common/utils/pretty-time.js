const prettyMilliseconds = require("pretty-ms")

module.exports = (time) =>
  prettyMilliseconds(time, {
    secondsDecimalDigits: 0,
  })
