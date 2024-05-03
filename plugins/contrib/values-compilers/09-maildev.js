const extractComponents = require("./helpers/extract-components")

const maildev = async (values, _options, { _config, utils, _ctx }) => {
  const { deepmerge } = utils

  const components = extractComponents("maildev", values)

  components.forEach(([key, component]) => {
    const persistenceEnabled =
      component.persistence.enabled !== null
        ? component.persistence.enabled
        : !!values.global.env.preprod

    /** @type {import("./09-maildev-schema").MailDevSchema} */
    const maildevValues = {
      host: component.host || `${key}-${values.global.host}`,
      repositoryName: values.global.repositoryName,
      ingress: {
        annotations: values.global.ingress.annotations,
      },
      persistence: {
        enabled: persistenceEnabled,
      },
      cron: {
        enabled: persistenceEnabled,
      },
    }

    deepmerge(component, maildevValues)
  })
}

module.exports = maildev
