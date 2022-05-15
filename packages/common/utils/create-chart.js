module.exports = (name, options = {}) => ({
  apiVersion: "v2",
  name,
  version: "0.0.0",
  dependencies: [],
  ...options,
})
