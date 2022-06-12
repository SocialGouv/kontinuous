module.exports = function ({ validators: { md5 } }) {
  return {
    type: "string",
    validate: md5,
  }
}
