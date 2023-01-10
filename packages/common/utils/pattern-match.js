const micromatch = require("micromatch")

module.exports = (str, pattern, options = {}) =>
  micromatch.match(str, pattern, {
    regex: true,
    ...options,
  }).length > 0
