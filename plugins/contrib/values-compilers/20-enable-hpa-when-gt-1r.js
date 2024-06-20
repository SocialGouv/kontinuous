const extractComponents = require("./helpers/extract-components")

module.exports = async (values, _options, { utils }) => {
  const { deepmerge } = utils

  const components = extractComponents(["app", "hasura", "daemon"], values)

  components.forEach(([_key, componentValues]) => {
    const replicas = componentValues.replicas ?? values.global.replicas
    if (replicas < 2) {
      return
    }
    const valuesPatch = {
      autoscale: {
        enabled: true,
      },
    }

    deepmerge(componentValues, valuesPatch)
  })
}
