const camelcase = require("lodash.camelcase")

module.exports = (manifest) => {
  const { metadata } = manifest
  const annotations = metadata?.annotations

  const needsName = annotations["kontinuous/needsName"]
  const chartNameTop = annotations["kontinuous/depname.chartNameTop"]
  const name = needsName ? [chartNameTop, needsName].join("/") : chartNameTop

  return camelcase(name)
}
