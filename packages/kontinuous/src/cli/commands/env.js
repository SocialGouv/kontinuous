const refEnv = require("~common/utils/ref-env")
const getRemoteKontinuousEnvironmentPatterns = require("~common/utils/get-remote-kontinuous-environment-patterns")
const ctx = require("~/ctx")

const options = require("../options")

module.exports = (program) =>
  program
    .command("env")
    .description("Infer env from ref or branch")
    .addOption(options.env)
    .addOption(options.cwd)
    .addOption(options.subpath)
    .option(
      "--remote",
      "select from environment using kontinuous config from remote repo"
    )
    .argument("[ref]", "the ref")
    .action(async (ref, opts, _command) => {
      const config = ctx.require("config")

      let { environmentPatterns } = config

      if (opts.remote) {
        if (!ref) {
          ref = config.gitBranch
        }
        environmentPatterns = await getRemoteKontinuousEnvironmentPatterns(
          config.gitRepositoryUrl,
          ref
        )
      }

      let env
      if (ref) {
        env = refEnv(ref, environmentPatterns)
      } else {
        env = config.environment
      }

      process.stdout.write(env || "")
    })
