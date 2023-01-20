module.exports = () => {
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
