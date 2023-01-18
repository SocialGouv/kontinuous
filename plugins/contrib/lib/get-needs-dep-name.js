const camelcase = require("lodash.camelcase")

module.exports = (manifest) => {
  const { metadata } = manifest
  const annotations = metadata?.annotations

  const name =
    annotations["kontinuous/needsName"] ||
    annotations["kontinuous/depname.chartName"]

  return camelcase(name)
}
