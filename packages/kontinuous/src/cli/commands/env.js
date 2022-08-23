const refEnv = require("~common/utils/ref-env")
const loadRemoteConfig = require("~common/config/load-remote-config")
const ctx = require("~common/ctx")

const options = require("../options")

module.exports = (program) =>
  program
    .command("env")
    .description("Infer env from ref or branch")
    .addOption(options.env)
    .addOption(options.cwd)
    .addOption(options.subpath)
    .addOption(options.private)
    .addOption(options.deployKey)
    .option(
      "--remote",
      "select environment using kontinuous config from remote repo"
    )
    .argument("[ref]", "the ref")
    .action(async (ref, opts, _command) => {
      const config = ctx.require("config")

      let { environmentPatterns } = config

      if (opts.remote) {
        if (!ref) {
          const { event } = config
          ref = event === "deleted" ? "HEAD" : config.gitBranch
        }
        const repositoryConfig = await loadRemoteConfig({
          repository: config.gitRepositoryUrl,
          ref,
          deployKey: config.deployKeyFile,
        })
        environmentPatterns = repositoryConfig.environmentPatterns
      }

      let env
      if (ref) {
        env = refEnv(ref, environmentPatterns)
      } else {
        env = config.environment
      }

      process.stdout.write(env || "")
    })
