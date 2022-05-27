const os = require("os")
const path = require("path")
const { mkdtemp } = require("fs/promises")

const loadStructuredConfig = require("~common/utils/load-structured-config")

const getGitRef = require("~common/utils/get-git-ref")
const getGitSha = require("~common/utils/get-git-sha")
const getGitUrl = require("~common/utils/get-git-url")
const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const cleanGitRef = require("~common/utils/clean-git-ref")
const refEnv = require("~common/utils/ref-env")
const yaml = require("~common/utils/yaml")

const deepmerge = require("~common/utils/deepmerge")
const ctx = require("~/ctx")

const { version } = require(`${__dirname}/../../package.json`)

const mergeProjectsAndOrganizations = (config) => {
  const { organizations, projects, gitRepositoryName } = config
  if (projects && projects[gitRepositoryName]) {
    const project = projects[gitRepositoryName]
    const { organization } = project
    if (organization && organizations[organization]) {
      const org = organizations[organization]
      deepmerge(config, org)
    }
    deepmerge(config, project)
  }
}

const defaultRepositoryProvider = "https://github.com" // degit/tiged like

module.exports = async (opts = {}) => {
  const env = ctx.get("env") || process.env

  const rootConfigOverride = {
    workspacePath: {
      env: "KS_WORKSPACE_PATH",
      option: "cwd",
      default: process.cwd(),
    },
    workspaceSubPath: {
      env: "KS_WORKSPACE_SUBPATH",
      default: ".kontinuous",
    },
    workspaceKsPath: {
      defaultFunction: (config) =>
        path.join(config.workspacePath, config.workspaceSubPath),
    },
    gitBranch: {
      defaultFunction: async (config, { options, env: environ }) => {
        let ref
        if (options.branch) {
          ref = options.branch
        } else if (environ.KS_GIT_BRANCH) {
          ref = environ.KS_GIT_BRANCH
        } else if (environ.KS_GIT_REF) {
          ref = environ.KS_GIT_REF
        } else {
          ref = await getGitRef(config.workspacePath)
        }
        return cleanGitRef(ref)
      },
    },
    gitSha: {
      env: "KS_GIT_SHA",
      option: "commit",
      defaultFunction: (config) => getGitSha(config.workspacePath),
    },
    gitRepositoryUrl: {
      defaultFunction: (config, { options, env: environ }) => {
        if (environ.KS_GIT_REPOSITORY_URL) {
          return environ.KS_GIT_REPOSITORY_URL
        }
        const repository = options.repository || environ.KS_GIT_REPOSITORY
        if (repository) {
          if (repository.includes(":")) {
            return repository
          }
          return `${defaultRepositoryProvider}/${repository}`
        }
        return getGitUrl(config.workspacePath)
      },
    },
    gitRepository: {
      defaultFunction: (config) =>
        repositoryFromGitUrl(config.gitRepositoryUrl),
    },
    gitRepositoryName: {
      defaultFunction: (config) => path.basename(config.gitRepository),
    },
  }

  const configOverride = {
    kontinuousPath: {
      env: "KS_KONTINUOUS_PATH",
      default: path.resolve(`${__dirname}/../..`),
    },
    version: {
      default: version,
    },
    chart: {
      env: "KS_CHART",
      envParser: (str) => (str[0] === "[" ? JSON.parse(str) : str.split(",")),
      option: "chart",
    },
    helmArgs: {
      env: "KS_HELM_ARGS",
      option: "A",
    },
    inlineValues: {
      env: "KS_INLINE_VALUES",
      option: "inline-values",
    },
    set: {
      env: "KS_INLINE_SET",
      envParser: (str) => yaml.load(str),
      option: "set",
    },
    buildPath: {
      env: "KS_BUILD_PATH",
      defaultFunction: () => mkdtemp(path.join(os.tmpdir(), "kontinuous-")),
    },
    buildProjectPath: {
      defaultFunction: (config) =>
        path.join(config.buildPath, "charts", "project"),
    },
    uploadUrl: {
      env: "KS_BUILD_UPLOAD_URL",
      option: "upload",
    },
    environment: {
      env: "KS_ENVIRONMENT",
      option: "E",
      defaultFunction: (config) => refEnv(config.gitRef),
    },
    webhookToken: {
      option: "webhook-token",
      env: "KS_WEBHOOK_TOKEN",
      defaultFunction: (config) => config.webhook?.token,
    },
    webhookBaseDomain: {
      option: "webhook-base-domain",
      env: "KS_WEBHOOK_BASE_DOMAIN",
      defaultFunction: (config) => config.webhook?.baseDomain,
    },
    webhookUriPattern: {
      option: "webhook-uri-pattern",
      env: "KS_WEBHOOK_URI_PATTERN",
      defaultFunction: (config) => config.webhook?.uriPattern,
    },
    webhookUri: {
      option: "webhook-uri",
      env: "KS_WEBHOOK_URI",
      defaultFunction: (config) => {
        if (config.webhook?.uri) {
          return config.webhook.uri
        }
        const { webhookUriPattern } = config
        if (!webhookUriPattern) {
          return null
        }
        return webhookUriPattern
          .replace("${repositoryName}", config.repositoryName)
          .replace("${baseDomain}", config.webhookBaseDomain)
      },
    },
  }

  const rootConfig = await loadStructuredConfig({
    configOverride: rootConfigOverride,
    options: opts,
    env,
  })

  const configDirs = []
  const homedir = os.homedir()
  if (homedir) {
    configDirs.push(`${homedir}/.kontinuous`)
  }
  configDirs.push(rootConfig.workspaceKsPath)

  const config = await loadStructuredConfig({
    rootConfig,
    configBasename: "config",
    configDirs,
    configCompilers: [mergeProjectsAndOrganizations],
    configOverride,
    options: opts,
    env,
    emptyAsUndefined: true,
  })

  return config
}
