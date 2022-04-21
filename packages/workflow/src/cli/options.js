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

module.exports.cwd = new Option("--cwd <path>", "set current working directory")

module.exports.debug = new Option("--debug, -d", "enable debugging loglevel")
