// eslint-disable import/no-extraneous-dependencies
const compilers = [
  "./unfold-charts",
  "./dash-instances",
  "./implicit-enabled",
  "./jobs",
]

module.exports = async (values, options = {}) => {
  for (const compiler of compilers) {
    values = await require(compiler)(values, options)
  }
  return values
}
