// eslint-disable import/no-extraneous-dependencies
const compilers = ["./unfold-charts", "./implicit-enabled", "./jobs"]

module.exports = async (values, methods, options = {}) => {
  for (const compiler of compilers) {
    values = await require(compiler)(values, methods, options)
  }
  return values
}
