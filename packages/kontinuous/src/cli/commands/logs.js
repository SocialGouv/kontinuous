const { Option } = require("commander")

const { configureDebug } = require("~common/utils/logger")
const logs = require("~/logs")

const options = require("../options")

module.exports = (program) =>
  program
    .command("logs")
    .description("stream logs pipeline from webhook")
    .addOption(options.cwd)
    .addOption(options.webhookBaseDomain)
    .option("--repository <repo>", "git repository url, default to current")
    .option("--branch <ref>", "git branch, default to current")
    .option(
      "--commit <commit>",
      "git commit sha, default to last commit of branch"
    )
    .option("--token <token>", "kubewebook token")
    .option("--webhook-uri <uri>", "kubewebook uri")
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
