const camelcase = require("lodash.camelcase")

module.exports = async (values) => {
  if (!values.runs) {
    return
  }
  values.outputs = {}
  const { outputs } = values
  for (const run of values.runs) {
    const name = camelcase(run.name)
    outputs[name] = `$(cat /workflow/vars/${run.name}/%s)`
  }
}
