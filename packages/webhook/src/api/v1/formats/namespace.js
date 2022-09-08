module.exports = function ({ validators: { namespace } }) {
  return {
    type: "string",
    validate: namespace,
  }
}
