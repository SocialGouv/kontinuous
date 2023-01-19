const { Command } = require("commander")

const loadConfig = require("~common/config/load-config")
const ctx = require("~common/ctx")
const createLogger = require("~common/utils/logger-factory")
const globalLogger = require("~common/utils/logger")

const options = require("./options")

module.exports = () => {
  const program = new Command()

  program
    .name("kontinuous")
    .description("CI/CD for Kubernetes 🚀")
    .version(require(`${__dirname}/../../package.json`).version)
    .addOption(options.debug)
    .addOption(options.inlineConfig)
    .addOption(options.configSet)
    .hook("preAction", async (_thisCommand, actionCommand) => {
      const opts = actionCommand.optsWithGlobals()

      const config = await loadConfig(opts)
      ctx.set("config", config)

      const loggerOverride = ctx.get("loggerOverride")
      let logger = createLogger({
        sync: true,
        secrets: [...(config.webhookToken ? [config.webhookToken] : [])],
      })
      if (loggerOverride) {
        logger = loggerOverride(logger, config)
      }
      ctx.set("logger", logger)

      logger.configureDebug(opts.D)
      globalLogger.configureDebug(opts.D)
    })

  return program
}
