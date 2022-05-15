const { Command } = require("commander")

const ctx = require("~/ctx")

const options = require("./options")

const loadConfig = require("./load-config")

const program = new Command()

program
  .name("kube-workflow")
  .description("CI pipeline running on Kubernetes deploying to Kubernetes 🚀")
  .version(require(`${__dirname}/../../package.json`).version)
  .addOption(options.debug)
  .hook("preAction", async (_thisCommand, actionCommand) => {
    const opts = actionCommand.optsWithGlobals()
    const config = await loadConfig(opts)
    ctx.set("config", config)
  })

module.exports = program
