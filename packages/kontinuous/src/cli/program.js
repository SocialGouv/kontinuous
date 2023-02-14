const { Command } = require("commander")

const loadConfig = require("~common/config/load-config")
const ctx = require("~common/ctx")

const options = require("./options")

module.exports = () => {
  const program = new Command()

  const { version } = require(`${__dirname}/../../package.json`)

  program
    .name("kontinuous")
    .description(`Kontinuous CI/CD for Kubernetes 🥷 - v${version}`)
    .version(version)
    .addOption(options.debug)
    .addOption(options.inlineConfig)
    .addOption(options.configSet)
    .hook("preAction", async (_thisCommand, actionCommand) => {
      const opts = actionCommand.optsWithGlobals()

      const logger = ctx.get("logger")
      if (opts.D) {
        logger.minLevel("debug")
      }

      const config = await loadConfig({
        ...opts,
        actionCommandName: actionCommand.name(),
      })
      ctx.set("config", config)

      logger.setSecrets([...(config.webhookToken ? [config.webhookToken] : [])])
      if (config.debug) {
        logger.minLevel("debug")
      }
    })

  return program
}
