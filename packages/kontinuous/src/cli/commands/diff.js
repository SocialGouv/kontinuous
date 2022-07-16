const logger = require("~common/utils/logger")
const ctx = require("~/ctx")

const options = require("../options")

module.exports = (program) =>
  program
    .command("diff")
    .description("get git diff between local and remote")
    .addOption(options.cwd)
    .action(async (_opts, _command) => {
      const config = ctx.require("config")
      const { diffBranch, commits } = config
      logger.info(`diff branch: ${diffBranch}`)
      process.stdout.write(JSON.stringify(commits, null, 2))
    })
