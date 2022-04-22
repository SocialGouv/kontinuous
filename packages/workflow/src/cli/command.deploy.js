const { configureDebug } = require("~common/utils/logger")
const deploy = require("~/deploy")

const program = require("./program")

const options = require("./options")

module.exports = program
  .command("deploy")
  .alias("d")
  .addOption(options.env)
  .addOption(options.charts)
  .addOption(options.subcharts)
  .addOption(options.noTree)
  .addOption(options.helmArgs)
  .addOption(options.inlineValues)
  .addOption(options.cwd)
  .addOption(options.upload)
  .option(
    "--file, -f <file>",
    "select a manifests yaml file, default will build one"
  )
  .option(
    "--rancher-project-name <project>",
    "rancher project name, default to repository basename"
  )
  .option(
    "--rancher-project-id <project-id>",
    "rancher project id, default retrieved from ci namespace"
  )
  .option(
    "--kubeconfig-context <context>",
    "kubeconfig context, default inferred from environment"
  )
  .option("--kubeconfig-context-no-detect", "don't infer kubeconfig context")
  .option("--timeout <timeout>", "deploy wait timeout, default 15m0s")
  .description(
    "Deploy manifests using kapp with current directory configuration"
  )
  .action(async (_opts, command) => {
    const opts = command.optsWithGlobals()
    configureDebug(opts.D)
    await deploy(opts)
  })
