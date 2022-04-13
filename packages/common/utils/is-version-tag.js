const versionTagRe = /v[0-9][0-9]*/

module.exports = (tag) => versionTagRe.test(tag)
