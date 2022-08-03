const micromatch = require("micromatch")

module.exports = (ref, patterns) => {
  if (!ref) {
    return null
  }
  for (const [key, pattern] of Object.entries(patterns)) {
    if (pattern && micromatch.isMatch(ref, pattern)) {
      return key
    }
  }
  return null
}
