// eslint-disable import/no-extraneous-dependencies
const compilers = [
  require("./unfold-charts"),
  require("./dash-instances"),
  require("./implicit-enabled"),
  // require("./jobs"),
]

module.exports = async (values, options, context) => {
  for (const compiler of compilers) {
    values = await compiler(values, options, context)
  }
  return values
}
