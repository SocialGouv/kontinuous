const redact = require("./redact")

module.exports = (config) => {
  const {
    secrets,
    fromEnvVars,
    fromEnvVarsRegex,
    hideCharsCount,
    stringSubstition,
    repeatCharSubstition,
    processEnv,
  } = config

  const extractedSecretsEnv = fromEnvVars
    .map((key) => processEnv[key])
    .filter((val) => !!val)

  const extractedSecretsEnvRegex = fromEnvVarsRegex
    .filter(([key]) => !!processEnv[key])
    .map(([key, regex]) => {
      const value = processEnv[key]
      const [, match] = value.match(regex)
      return match
    })
    .filter((val) => !!val)

  const redactOptions = {
    secrets: [...secrets, ...extractedSecretsEnv, ...extractedSecretsEnvRegex],
    hideCharsCount,
    stringSubstition,
    repeatCharSubstition,
  }
  return (message) => redact(message, redactOptions)
}
