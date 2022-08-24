const test = require("~/test")

const options = require("../options")

module.exports = (program) =>
  program
    .command("test")
    .description("test against current repo snapshot")
    .addOption(options.cwd)
    .option("--update, -u", "update snapshots")
    .action(async (_opts, command) => {
      const opts = command.optsWithGlobals()
      await test(opts)
    })
