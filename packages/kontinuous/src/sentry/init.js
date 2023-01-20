const packageDef = require("../../package.json")

const getConfig = require("./get-config")
const beforeBreadcrumbRefDefault = require("./before-breadcrumb-ref-default")

module.exports = ({
  beforeBreadcrumbRef = beforeBreadcrumbRefDefault,
  ...options
} = {}) => {
  const { sentryEnabled, sentryDSN, Sentry } = getConfig()

  if (!sentryEnabled) {
    return
  }

  Sentry.init({
    dsn: sentryDSN,
    normalizeDepth: 10,
    release: packageDef.version,
    beforeBreadcrumb: (breadcrumb, hint) =>
      beforeBreadcrumbRef.callback(breadcrumb, hint),
    ...options,
  })
  return Sentry
}
