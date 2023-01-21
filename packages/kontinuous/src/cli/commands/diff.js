const ctx = require("~common/ctx")

const options = require("../options")

module.exports = (program) =>
  program
    .command("diff")
    .description("get git diff between local and remote")
    .addOption(options.cwd)
    .action(async (_opts, _command) => {
      const config = ctx.require("config")
      const logger = ctx.require("logger")
      const { gitDiffBranch, gitDiffCommits } = config
      logger.info(`diff branch: ${gitDiffBranch}`)
      process.stdout.write(JSON.stringify(gitDiffCommits, null, 2))
    })
