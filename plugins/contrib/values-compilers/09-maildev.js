function isMaildevComponent(component) {
  return component[`~chart`]?.endsWith(".contrib.maildev")
}

function extractMaildevComponents(values, acc = []) {
  Object.entries(values).forEach(([key, component]) => {
    if (typeof component === "object" && component !== null) {
      extractMaildevComponents(component, acc)
      if (component._isChartValues && isMaildevComponent(component)) {
        acc.push([key, component])
      }
    }
  })
  return acc
}

const maildev = async (values, _options, { _config, utils, _ctx }) => {
  console.log("maildev", values)
  const { deepmerge } = utils

  const components = extractMaildevComponents(values)

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
