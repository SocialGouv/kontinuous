const refEnv = require("~common/utils/ref-env")
const ctx = require("~/ctx")

const options = require("../options")

module.exports = (program) =>
  program
    .command("env")
    .description("Infer env from ref or branch")
    .addOption(options.env)
    .addOption(options.cwd)
    .argument("[ref]", "the ref")
    .action(async (ref, _opts, _command) => {
      let env
      if (ref) {
        env = refEnv(ref)
      } else {
        const config = ctx.require("config")
        env = config.environment
      }
      process.stdout.write(env)
    })
