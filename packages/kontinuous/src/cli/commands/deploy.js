const deploy = require("~/deploy")

const options = require("../options")

module.exports = (program) =>
  program
    .command("deploy")
    .alias("d")
    .addOption(options.env)
    .addOption(options.chart)
    .addOption(options.helmArgs)
    .addOption(options.inlineValues)
    .addOption(options.set)
    .addOption(options.cwd)
    .addOption(options.subpath)
    .addOption(options.upload)
    .addOption(options.uploadUrl)
    .addOption(options.statusUrl)
    .addOption(options.rancherProjectId)
    .addOption(options.ciNamespace)
    .addOption(options.webhookToken)
    .addOption(options.webhookUri)
    .addOption(options.deployWith)
    .addOption(options.ignoreProjectTemplates)
    .addOption(options.kubeconfigContext)
    .addOption(options.kubeconfigContextNoDetect)
    .addOption(options.disablePlugin)
    .option(
      "--on-webhook, -w",
      "trigger built manifests deploying via webhook endpoint"
    )
    .option(
      "--on-webhook-detach",
      "don't follow logs from webhook custom manifest deploy, no effect if not used with --on-webhook/-w"
    )
    .option(
      "--job-hash <jobHash>",
      "job hash, default to generated manifests hash"
    )
    .option(
      "--file, -f <file>",
      "select a manifests yaml file, default will build one"
    )
    .option("--timeout <timeout>", "deploy wait timeout, default 15m")
    .option("--dry-run", "run all things except the deployment")
    .description(
      "Deploy manifests using kapp with current directory configuration"
    )
    .action(async (_opts, command) => {
      const opts = command.optsWithGlobals()
      await deploy(opts)
    })
