const { Option } = require("commander")

module.exports.env = new Option(
  "--env, -e <env>",
  "select environment, default autodetect from current git branch"
).choices(["dev", "preprod", "prod"])

module.exports.charts = new Option(
  "--charts <charts>",
  "comma separated list of charts to enable as standalone"
)

module.exports.subcharts = new Option(
  "--subcharts <subcharts>",
  "comma separated list of subcharts to enable as a part of the main chart"
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
  "final deep override of values"
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
