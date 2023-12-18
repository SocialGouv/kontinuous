// @ts-check

/**
 * @param {object} component
 * @return {component is import("./09-maildev").MailDevComponent}
 */
function isMaildevComponent(component) {
  return component[`~chart`]?.endsWith(".contrib.maildev")
}

/**
 *
 * @param {import("./09-maildev").ValuesPlugin} values
 */
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
/**
 *
 * @param {import("./09-maildev").MailDevValues} values
 * @param {*} _options
 * @param {import("./09-maildev").MailDevParams} param2
 * @returns
 */
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

// @ts-ignore
module.exports = maildev
