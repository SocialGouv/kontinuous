const getConfig = () => {
  const { env } = process
  const sentryDSN = env.KS_SENTRY_DSN
  const sentryEnabled =
    env.KS_SENTRY_ENABLED !== undefined
      ? env.KS_SENTRY_ENABLED && env.KS_SENTRY_ENABLED !== "false"
      : !!sentryDSN

  const Sentry = sentryEnabled ? require("@sentry/node") : null

  return {
    sentryDSN,
    sentryEnabled,
    Sentry,
  }
}

const init = (options = {}) => {
  const { sentryEnabled, sentryDSN, Sentry } = getConfig()
  if (!sentryEnabled) {
    return
  }
  Sentry.init({
    dsn: sentryDSN,
    ...options,
  })
  return Sentry
}

module.exports = { init, getConfig }
