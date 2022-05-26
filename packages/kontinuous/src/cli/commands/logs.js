const { Option } = require("commander")

const { configureDebug } = require("~common/utils/logger")
const logs = require("~/logs")

const options = require("../options")

module.exports = (program) =>
  program
    .command("logs")
    .description("stream logs pipeline from webhook")
    .addOption(options.cwd)
    .addOption(options.repository)
    .addOption(options.branch)
    .addOption(options.commit)
    .addOption(options.webhookToken)
    .addOption(options.webhookBaseDomain)
    .addOption(options.webhookUriPattern)
    .addOption(options.webhookUri)
    .addOption(
      new Option(
        "event",
        `pipeline event, default to "created" on version tag, "pushed" else`
      ).choices(["pushed", "deleted", "created"])
    )
    .action(async (_opts, command) => {
      const opts = command.optsWithGlobals()
      configureDebug(opts.D)
      await logs(opts)
    })
