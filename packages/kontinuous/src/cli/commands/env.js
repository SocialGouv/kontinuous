const refEnv = require("~/env")
const ctx = require("~/ctx")

const options = require("../options")

module.exports = (program) =>
  program
    .command("env")
    .description("Infer env from ref or branch")
    .addOption(options.env)
    .addOption(options.cwd)
    .addOption(options.subpath)
    .argument("[ref]", "the ref")
    .action(async (ref, _opts, _command) => {
      const config = ctx.require("config")
      let env
      if (ref) {
        env = refEnv(ref, config.environmentPatterns)
      } else {
        env = config.environment
      }
      process.stdout.write(env)
    })
