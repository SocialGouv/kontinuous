const commitToken = require("~common/utils/commit-token")

const program = require("./program")

module.exports = program
  .command("commit-token")
  .argument("<commit>", "the commit sha1")
  .argument("<token>", "the webhook token")
  .description("Get commit token hash for a given commit and webhook token")
  .action(async (commit, token, _opts, _command) => {
    process.stdout.write(commitToken(commit, token))
  })
