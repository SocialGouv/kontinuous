const mergeWith = require("lodash.mergewith")

/**
 * Helm like deep merge
 * @param {object} objValue
 * @param  {...object} srcValues
 * @returns {object}
 */
module.exports = (objValue, ...srcValues) =>
  mergeWith(objValue, ...srcValues, (oValue, srcValue) => {
    if (Array.isArray(oValue)) {
      return srcValue
    }
  })
