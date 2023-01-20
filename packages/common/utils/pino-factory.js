module.exports = (opts = {}) => {
  const pino = require("pino") // require here to make lib optional in cli

  const { prettyOptions = {}, ...mergeOptions } = opts
  const options = {
    pretty: true,
    prettyOptions: {
      // translateTime: "yyyy-mm-dd HH:MM:ss",
      ignore: "pid,hostname,time,level",
      customColors: "message:blueBright,greyMessage:gray",
      singleLine: true, // Print each log message on a single line (errors will still be multi-line)
      // hideObject: true, // Hide objects from output (but not error object)
      ...prettyOptions,
    },
    destination: 2,
    level: "trace",
    secrets: mergeOptions.secrets || [],
    ...mergeOptions,
  }
  let logger = pino({
    transport: {
      pipeline: [
        {
          target: "pino-bfuscate",
          options,
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

  logger = logger.child({}, { serializers: { error: pino.stdSerializers.err } })

  logger.configureDebug = configureDebug

  return logger
}
