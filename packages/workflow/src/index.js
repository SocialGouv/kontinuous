const { Command, Option } = require("commander")

const program = new Command()

const { configureDebug } = require("~/utils/logger")

const build = require("~/build")
const deploy = require("~/deploy")

program
  .name("kube-workflow")
  .description("CI pipeline running on Kubernetes deploying to Kubernetes 🚀")
  .version(require(`${__dirname}/../package.json`).version)
  .addOption(
    new Option(
      "--env, -e <env>",
      "select environment, default autodetect from current git branch"
    ).choices(["dev", "preprod", "prod"])
  )
  .option("--components, -c <component>", "override components to enable")
  .option("--helm-args, -a <args>", "add extra helm arguments")
  .option("--cwd <path>", "set current working directory")
  .option("--debug, -d", "enable debugging loglevel")

program
  .command("build")
  .alias("b")
  .description(
    "Build manifests using kube-workflow with current directory configuration"
  )
  .option("--output, -o", "enable direct output of manifest")
  .option(
    "--syntax-highlight, -s",
    "enable syntax highlight for yaml when used with -o"
  )
  .action(async (_options, command) => {
    const options = command.optsWithGlobals()
    configureDebug(options.D)
    await build(options)
  })

program
  .command("deploy")
  .alias("d")
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
  .description(
    "Deploy manifests using kapp with current directory configuration"
  )
  .action(async (_options, command) => {
    const options = command.optsWithGlobals()
    configureDebug(options.D)
    await deploy(options)
  })

program.parse(process.argv)
