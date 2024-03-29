const ctx = require("~common/ctx")
const build = require("~/build")

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
    .addOption(options.editor)
    .addOption(options.ciNamespace)
    .addOption(options.ignoreProjectTemplates)
    .addOption(options.kubeconfigContext)
    .addOption(options.noValidate)
    .addOption(options.disablePlugin)
    .addOption(options.disableStep)
    .addOption(options.gitDiffEnabled)
    .addOption(options.gitOrg)
    .option("--output, -o", "enable direct output of manifests")
    .option("--open", "open manifests file with default application")
    .option(
      "--syntax-highlight, -s",
      "enable syntax highlight for yaml when used with -o"
    )
    .action(async (_opts, command) => {
      const opts = command.optsWithGlobals()
      const result = await build(opts)
      ctx.set("result", result)
    })
