module.exports = function ({ validators: { clusterName } }) {
  return {
    type: "string",
    validate: clusterName,
  }
}
