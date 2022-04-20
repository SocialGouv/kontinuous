module.exports = function ({ validators: { sha1 } }) {
  return {
    type: "string",
    validate: sha1,
  }
}
