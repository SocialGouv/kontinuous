const { configureDebug } = require("~common/utils/logger")
const build = require("~/build")

const ctx = require("~/ctx")
const options = require("../options")

module.exports = (program) =>
  program
    .command("build")
    .alias("b")
    .description(
      "Build manifests using kontinuous with current directory configuration"
    )
    .addOption(options.env)
    .addOption(options.chart)
    .addOption(options.inlineValues)
    .addOption(options.set)
    .addOption(options.helmArgs)
    .addOption(options.cwd)
    .addOption(options.subpath)
    .addOption(options.repository)
    .addOption(options.branch)
    .addOption(options.commit)
    .addOption(options.upload)
    .addOption(options.uploadUrl)
    .addOption(options.ciNamespace)
    .option("--output, -o", "enable direct output of manifests")
    .option("--open", "open manifests file with default application")
    .option(
      "--syntax-highlight, -s",
      "enable syntax highlight for yaml when used with -o"
    )
    .action(async (_opts, command) => {
      const opts = command.optsWithGlobals()
      configureDebug(opts.D)
      const result = await build(opts)
      ctx.set("result", result)
    })
