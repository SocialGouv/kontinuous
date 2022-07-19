module.exports = function ({ validators: { projectName } }) {
  return {
    type: "string",
    validate: projectName,
  }
}
