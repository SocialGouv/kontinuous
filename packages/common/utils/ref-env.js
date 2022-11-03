const patternMatch = require("./pattern-match")

module.exports = (ref, patterns) => {
  if (!ref) {
    return null
  }
  for (const [key, pattern] of Object.entries(patterns)) {
    if (pattern && patternMatch(ref, pattern)) {
      return key
    }
  }
  return null
}
