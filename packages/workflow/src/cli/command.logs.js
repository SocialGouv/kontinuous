const { Option } = require("commander")

const { configureDebug } = require("~common/utils/logger")
const logs = require("~/logs")

const options = require("./options")

const program = require("./program")

module.exports = program
  .command("logs")
  .description("stream logs pipeline from webhook")
  .addOption(options.cwd)
  .addOption(options.rancherProjectName)
  .addOption(options.webhookBaseDomain)
  .option("--repository", "git repository url, default to current")
  .option("--branch", "git branch, default to current")
  .option("--commit", "git commit sha, default to last commit of branch")
  .option("--token", "kubewebook token")
  .option("--webhook-uri", "kubewebook uri")
  .addOption(
    new Option(
      "[event]",
      `pipeline event, default to "created" on version tag, "pushed" else`
    ).choices(["pushed", "deleted", "created"])
  )
  .action(async (_opts, command) => {
    const opts = command.optsWithGlobals()
    configureDebug(opts.D)
    await logs(opts)
  })
