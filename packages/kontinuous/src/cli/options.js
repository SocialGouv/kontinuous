const { Option } = require("commander")

module.exports.env = new Option(
  "--env, -e <env>",
  "select environment, default autodetect from current git branch"
).choices(["dev", "preprod", "prod"])

module.exports.chart = new Option(
  "--chart <chart...>",
  "chart to enable as standalone, you can call it multiple times"
)

module.exports.helmArgs = new Option(
  "--helm-args, -a <args>",
  "add extra helm arguments"
)

module.exports.inlineValues = new Option(
  "--inline-values <yaml>",
  "deep override of values"
)

module.exports.set = new Option(
  "--set <pair...>",
  "update value key or subkey, syntax is --set global.namespace=foo-barjo, you can call it multiple times"
)

module.exports.inlineConfig = new Option(
  "--inline-config <yaml>",
  "deep override of config"
)

module.exports.configSet = new Option(
  "--config-set <pair...>",
  "update value key or subkey, syntax is --config-set dependencies.fabrique.patches.rancherProjectId.options.resolve=required, you can call it multiple times"
)

module.exports.cwd = new Option("--cwd <path>", "set current working directory")
module.exports.subpath = new Option(
  "--subpath <path>",
  "override .kontinuous directory path"
)

module.exports.debug = new Option("--debug, -d", "enable debugging loglevel")

module.exports.upload = new Option("--upload", "upload manifests")
module.exports.uploadUrl = new Option(
  "--upload-url  <url>",
  "url to upload artifacts"
)

module.exports.downloadUrl = new Option(
  "--download-url  <url>",
  "url to download artifacts"
)

module.exports.statusUrl = new Option(
  "--status-url <url>",
  "post status to url"
)

module.exports.webhookToken = new Option(
  "--webhook-token <token>",
  "webhook token"
)

module.exports.webhookUri = new Option("--webhook-uri <uri>", "webhook uri")

module.exports.editor = new Option(
  "--editor <editor>",
  "force editor to use on --open flag, default will guess"
)

module.exports.deployWith = new Option(
  "--deploy-with <plugin>",
  "set deploy-with plugin to handle the deployment"
)

module.exports.ciNamespace = new Option("--ci-namespace <ns>", "ci namespace")

module.exports.rancherProjectId = new Option(
  "--rancher-project-id <project-id>",
  "rancher project id, default retrieved from ci namespace"
)

module.exports.repository = new Option(
  "--repository <repo>",
  "git repository url, default to current"
)

module.exports.branch = new Option(
  "--branch <ref>",
  "git branch, default to current"
)

module.exports.commit = new Option(
  "--commit <commit>",
  "git commit sha, default to last commit of branch"
)

module.exports.event = new Option(
  "--event <event>",
  `pipeline event, default to "pushed"`
).choices(["pushed", "deleted", "custom"])

module.exports.ignoreProjectTemplates = new Option(
  "--ignore-project-templates",
  "don't merge project's root templates and env templates"
)

module.exports.kubeconfigContext = new Option(
  "--kubeconfig-context <context>",
  "kubeconfig context, default inferred from environment"
)

module.exports.kubeconfigContextNoDetect = new Option(
  "--kubeconfig-context-no-detect",
  "don't infer kubeconfig context"
)

module.exports.deployKey = new Option(
  "--deploy-key <path>",
  "ssh deploy to use for private repo remote config download"
)

module.exports.private = new Option(
  "--private",
  "remote config download on private repo"
)
