const { Command } = require("commander")

const options = require("./options")

const loadEnvConfig = require("./load-env-config")

const program = new Command()

program
  .name("kube-workflow")
  .description("CI pipeline running on Kubernetes deploying to Kubernetes 🚀")
  .version(require(`${__dirname}/../../package.json`).version)
  .addOption(options.debug)
  .hook("preAction", async (thisCommand, _actionCommand) => {
    const cwd = thisCommand.opts().cwd || process.cwd()
    await loadEnvConfig(cwd)
  })

module.exports = program
