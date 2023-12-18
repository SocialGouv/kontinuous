// @ts-check

/**
 * @param {object} component
 * @return {component is import("./09-maildev").MailDevComponent}
 */
function isMaildevComponent(component) {
  return component[`~chart`].endsWith(".contrib.maildev")
}

/**
 *
 * @param {import("./09-maildev").ValuesPlugin} values
 */
function extractMaildevComponents(values, acc = []) {
  Object.entries(values).forEach(([key, component]) => {
    if (typeof component === "object" && component !== null) {
      extractMaildevComponents(values, acc)
      if (values._isChartValues && isMaildevComponent(values)) {
        acc.push(values)
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
const maildev = async (values, _options, { _config, _utils, _ctx }) => {
  console.log("maildev", values)

  const components = extractMaildevComponents(values)

  console.log("component", components)
  //
  // todo: find all [`~chart`] === "project.fabrique.contrib.maildev"
  //
  Object.entries(values.project.fabrique.contrib).forEach(
    ([key, component]) => {
      if (isMaildevComponent(component)) {
        const persistenceEnabled =
          component.persistence.enabled !== null
            ? component.persistence.enabled
            : !!values.global.env.preprod

        component.maildev = {
          ...component.maildev,
          host: component.host || `${key}-${values.global.host}`,
          repositoryName: values.global.repositoryName,
          ingress: {
            ...(component.ingress || {}),
            annotations: values.global.ingress.annotations,
          },
          persistence: {
            enabled: persistenceEnabled,
          },
          cron: {
            enabled: persistenceEnabled,
          },
        }
      }
    }
  )
}

// @ts-ignore
module.exports = maildev
