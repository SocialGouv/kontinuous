const { Command } = require("commander")

const ctx = require("~/ctx")

const options = require("./options")

const loadConfig = require("./load-config")

module.exports = () => {
  const program = new Command()

  program
    .name("kontinuous")
    .description(
      "CI/CD on Kubernetes to Kubernetes (Helm + Kapp + some Kung-Fu) 🚀"
    )
    .version(require(`${__dirname}/../../package.json`).version)
    .addOption(options.debug)
    .addOption(options.inlineConfig)
    .addOption(options.configSet)
    .hook("preAction", async (_thisCommand, actionCommand) => {
      const opts = actionCommand.optsWithGlobals()
      const config = await loadConfig(opts)
      ctx.set("config", config)
    })

  return program
}
