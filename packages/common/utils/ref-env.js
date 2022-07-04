const micromatch = require("micromatch")

module.exports = (ref, patterns) => {
  for (const [key, pattern] of Object.entries(patterns)) {
    if (micromatch.isMatch(ref, pattern)) {
      return key
    }
  }
  return null
}
