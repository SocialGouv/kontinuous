const logs = require("~/logs")

const options = require("../options")

module.exports = (program) =>
  program
    .command("logs")
    .description("stream logs pipeline from webhook")
    .addOption(options.cwd)
    .addOption(options.subpath)
    .addOption(options.repository)
    .addOption(options.branch)
    .addOption(options.commit)
    .addOption(options.env)
    .addOption(options.webhookToken)
    .addOption(options.webhookUri)
    .addOption(options.event)
    .action(async (_opts, command) => {
      const opts = command.optsWithGlobals()
      await logs(opts)
    })
