const { Command } = require("commander")

const options = require("./options")

const program = new Command()

program
  .name("kube-workflow")
  .description("CI pipeline running on Kubernetes deploying to Kubernetes 🚀")
  .version(require(`${__dirname}/../../package.json`).version)
  .addOption(options.debug)

module.exports = program
