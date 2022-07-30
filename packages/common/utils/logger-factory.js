const pino = require("pino")

module.exports = (options = {}) => {
  const logger = pino({
    transport: {
      pipeline: [
        {
          target: `${__dirname}/logger-secrets-replace.js`,
          options: {
            pretty: true,
            prettyOptions: {
              translateTime: "yyyy-mm-dd HH:MM:ss",
              ignore: "pid,hostname",
            },
            destination: 2,
            level: "trace",
            secrets: options.secrets || [],
            ...options,
          },
        },
      ],
    },
  })

  const configureDebug = (debug) => {
    if (
      debug &&
      debug !== "0" &&
      debug !== "false" &&
      pino.levels.values.debug < pino.levels.values[logger.level]
    ) {
      logger.level = pino.levels.values.debug
    }
  }

  if (process.env.KS_LOG_LEVEL) {
    const logLevel = process.env.KS_LOG_LEVEL
    const logLevels = Object.keys(pino.levels.values)
    if (!logLevels.includes(logLevel)) {
      throw new Error(
        `unkown logLevel "${logLevel}", expected one of: ${logLevels.join(",")}`
      )
    }
    const levelValue = pino.levels.values[logLevel]
    logger.level = levelValue
  }
  configureDebug(process.env.KS_DEBUG || process.env.DEBUG)

  logger.configureDebug = configureDebug

  return logger
}
