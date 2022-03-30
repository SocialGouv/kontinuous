const camelcase = require("lodash.camelcase")
const defaultsDeep = require("lodash.defaultsdeep")

module.exports = async (values) => {
  const outputs = {}
  for (const key of Object.keys(values)) {
    if (key === "jobs" || key.startsWith("jobs-")) {
      for (const run of values[key].runs || []) {
        for (const name of run.scopes) {
          const ccName = camelcase(name)
          outputs[ccName] = `"$(cat "/workflow/vars/${name}/%s")"`
        }
      }
    }
  }
  defaultsDeep(values, {
    global: {
      extra: {
        jobs: {},
      },
    },
  })
  values.global.extra.jobs.outputs = outputs
}
