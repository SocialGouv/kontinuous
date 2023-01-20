const ctx = require("~common/ctx")

const dependencies = require("~/build/load-dependencies/dependencies")

const options = require("../options")

module.exports = (program) =>
  program
    .command("load-deps")
    .alias("load-dependencies")
    .description("Load all dependencies in current configuration")
    .addOption(options.env)
    .addOption(options.chart)
    .addOption(options.inlineValues)
    .addOption(options.set)
    .addOption(options.helmArgs)
    .addOption(options.cwd)
    .addOption(options.subpath)
    .addOption(options.repository)
    .addOption(options.disablePlugin)
    .action(async (_opts, _command) => {
      const config = ctx.require("config")
      const logger = ctx.require("logger")
      await dependencies(config, logger)
      logger.info("✔️  dependencies loaded")
    })
