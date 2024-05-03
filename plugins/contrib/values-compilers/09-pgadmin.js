const extractComponents = require("./helpers/extract-components")

module.exports = async (values, _options, { _config, utils, _ctx }) => {
  const { deepmerge } = utils
  const components = extractComponents("pgadmin", values)

  components.forEach(([key, componentValues]) => {
    const mergedValues = {
      host: componentValues.host || `${key}-${values.global.host}`,
      ingress: {
        annotations: values.global.ingress.annotations,
      },
    }

    deepmerge(componentValues, mergedValues)
  })
}
