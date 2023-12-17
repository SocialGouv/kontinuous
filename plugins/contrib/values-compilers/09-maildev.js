// @ts-check

/**
 * @param {object} component
 * @return {component is import("./09-maildev").MailDevComponent}
 */
function isMaildevComponent(component) {
  return component[`~chart`] === "project.fabrique.contrib.maildev"
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

  Object.entries(values.project.fabrique.contrib).forEach(
    ([key, component]) => {
      // todo: cast to MailDevComponent
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
