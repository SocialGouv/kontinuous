const omit = require("lodash.omit")
const defaults = require("lodash.defaults")

const ctx = require("~common/ctx")

const redactEnhancedFactory = require("~common/utils/redact-enhanced-factory")

const packageDef = require("../../package.json")

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

const preActionFactory = (Sentry) => async (_thisCommand, actionCommand) => {
  ctx.set("sentry", Sentry)

  // config
  const sentryKontinuousConfigDefault = {
    includeEnvVarPrefix: ["KS_", "GIT"],
    omitEnvVarsEq: ["KS_SENTRY_DSN"],
    omitEnvVarsContains: ["TOKEN"],
    secrets: [],
    secretsHideCharsCount: false,
    secretsStringSubstition: "***",
    secretsRepeatCharSubstition: "*",
    secretsFromEnvVars: [],
    secretsFromEnvVarsRegex: [["KS_NOTIFY_WEBHOOK_URL", /\bhooks\/([^-]+)/]],
  }

  const sentryEventOptionsDefault = {
    // denyUrls: [],
    release: packageDef.version,
  }

  const config = ctx.require("config")
  const processEnv = ctx.get("env") || process.env

  const { sentryKontinuousConfig, sentryEventOptions } = config

  defaults(sentryKontinuousConfig, sentryKontinuousConfigDefault)
  defaults(sentryEventOptions, sentryEventOptionsDefault)

  const { includeEnvVarPrefix, omitEnvVarsEq, omitEnvVarsContains } =
    sentryKontinuousConfigDefault

  const redactSecrets = redactEnhancedFactory({
    processEnv,
    secrets: sentryKontinuousConfig.secrets,
    fromEnvVars: sentryKontinuousConfig.secretsFromEnvVars,
    fromEnvVarsRegex: sentryKontinuousConfig.secretsFromEnvVarsRegex,
    hideCharsCount: sentryKontinuousConfig.secretsHideCharsCount,
    stringSubstition: sentryKontinuousConfig.secretsStringSubstition,
    repeatCharSubstition: sentryKontinuousConfig.secretsRepeatCharSubstition,
  })

  // configure event (set options after init)
  Sentry.configureScope((scope) => {
    scope.addEventProcessor((event) => {
      Object.assign(event, sentryEventOptions)
      event.beforeBreadcrumb = (breadcrumb) => {
        if (breadcrumb.category === "xhr") {
          breadcrumb.data.url = redactSecrets(breadcrumb.data.url)
        }
        return breadcrumb
      }
      return event
    })
  })

  // setContext
  Sentry.setContext(
    "config",
    omit(config, [
      "sentryDSN",
      "sentryKontinuousConfig",
      "sentryEventOptions",
      "webhookToken",
    ])
  )

  const commandName = actionCommand.name()
  const opts = actionCommand.optsWithGlobals()
  Sentry.setContext("command", {
    name: commandName,
    opts: Object.entries(opts).reduce((acc, [key, value]) => {
      acc[key] = redactSecrets(value)
      return acc
    }, {}),
    argv: process.argv.map((arg) => redactSecrets(arg)),
    env: Object.entries(process.env).reduce((acc, [key, value]) => {
      if (
        includeEnvVarPrefix.some((val) => key.startsWith(val)) &&
        !omitEnvVarsContains.some((val) => key.includes(val)) &&
        !omitEnvVarsEq.includes(key)
      ) {
        acc[key] = redactSecrets(value)
      }
      return acc
    }, {}),
  })
}

module.exports = { init, getConfig, preActionFactory }
