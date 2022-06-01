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

module.exports.cwd = new Option("--cwd <path>", "set current working directory")

module.exports.debug = new Option("--debug, -d", "enable debugging loglevel")

module.exports.upload = new Option("--upload <url>", "upload manifests to url")

module.exports.statusUrl = new Option(
  "--status-url <url>",
  "post status to url"
)

module.exports.webhookBaseDomain = new Option(
  "--webhook-base-domain <host>",
  "webhook base domain"
)

module.exports.webhookUriPattern = new Option(
  "--webhook-uri-pattern <pattern>",
  "webhook uri pattern, defaut to https://webhook-${repositoryName}.${baseDomain}"
)

module.exports.webhookToken = new Option(
  "--webhook-token <token>",
  "webhook token"
)

module.exports.webhookUri = new Option(
  "--webhook-uri <uri>",
  "webhook uri, default will use webhook-uri-pattern and webhook-base-domain to generate uri"
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
