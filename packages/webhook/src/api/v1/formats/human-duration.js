module.exports = function ({ validators: { humanDuration } }) {
  return {
    type: "string",
    validate: humanDuration,
  }
}
