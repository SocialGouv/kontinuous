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
}

const startTransaction = (options = {}) => {
  const { sentryEnabled, Sentry } = getConfig()
  if (!sentryEnabled) {
    return
  }
  const transaction = Sentry.startTransaction({
    ...options,
  })
  return transaction
}

const captureException = (error) => {
  const { sentryEnabled, Sentry } = getConfig()
  if (!sentryEnabled) {
    return
  }
  return Sentry.captureException(error)
}

const setContext = (name, context) => {
  const { sentryEnabled, Sentry } = getConfig()
  if (!sentryEnabled) {
    return
  }
  return Sentry.setContext(name, context)
}

module.exports = { init, startTransaction, captureException, setContext }
