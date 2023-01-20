const omit = require("lodash.omit")
const defaults = require("lodash.defaults")

const ctx = require("~common/ctx")
const redactEnhancedFactory = require("~common/utils/redact-enhanced-factory")

const beforeBreadcrumbRefDefault = require("./before-breadcrumb-ref-default")

module.exports = (Sentry) => async (_thisCommand, actionCommand) => {
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

  const config = ctx.require("config")
  const processEnv = ctx.get("env") || process.env

  const { sentryKontinuousConfig } = config

  defaults(sentryKontinuousConfig, sentryKontinuousConfigDefault)

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

  beforeBreadcrumbRefDefault.callback = (breadcrumb, _hint) => {
    if (breadcrumb.category === "http") {
      const redactedUrl = redactSecrets(breadcrumb.data.url)
      if (redactedUrl !== breadcrumb.data.url) {
        Sentry.addBreadcrumb({
          ...breadcrumb,
          data: {
            ...breadcrumb.data,
            url: redactedUrl,
          },
        })
        return null
      }
    }
    return breadcrumb
  }

  if (processEnv.GITHUB_RUN_ID) {
    Sentry.setContext("github", {
      jobUrl: `${processEnv.GITHUB_SERVER_URL}/${processEnv.GITHUB_REPOSITORY}/actions/runs/${processEnv.GITHUB_RUN_ID}`,
    })
  }

  // setContext
  Sentry.setContext(
    "config",
    Object.entries(
      omit(config, ["sentryDSN", "sentryKontinuousConfig", "webhookToken"])
    ).reduce((acc, [key, value]) => {
      acc[key] = redactSecrets(value)
      return acc
    }, {})
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
