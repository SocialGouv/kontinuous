const micromatch = require("micromatch")

/**
 * @param {string[]} str
 * @param {string} pattern
 * @param {Record<string, any>} options
 * @returns
 */
module.exports = (str, pattern, options = {}) =>
  micromatch.match(str, pattern, {
    regex: true,
    ...options,
  }).length > 0
