const { Option } = require("commander")

module.exports.env = new Option(
  "--env, -e <env>",
  "select environment, default autodetect from current git branch"
).choices(["dev", "preprod", "prod"])

module.exports.chart = new Option(
  "--chart <chart...>",
  "chart to enable as standalone, you can call it multiple times"
)

module.exports.noTree = new Option(
  "--no-tree",
  "disable manifests tree display"
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

module.exports.cwd = new Option("--cwd <path>", "set current working directory")

module.exports.debug = new Option("--debug, -d", "enable debugging loglevel")

module.exports.upload = new Option("--upload <url>", "upload manifests to url")

module.exports.rancherProjectName = new Option(
  "--rancher-project-name <project>",
  "rancher project name, default to repository basename"
)

module.exports.rancherProjectId = new Option(
  "--rancher-project-id <project-id>",
  "rancher project id, default retrieved from ci namespace"
)

module.exports.webhookBaseDomain = new Option(
  "--webhook-base-domain <host>",
  "webhook base domain"
)
