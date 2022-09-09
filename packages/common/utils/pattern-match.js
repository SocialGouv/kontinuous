const micromatch = require("micromatch")

module.exports = (str, pattern, options = {}) =>
  micromatch.isMatch(str, pattern, {
    regex: true,
    ...options,
  })
