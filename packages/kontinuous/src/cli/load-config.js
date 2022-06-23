const os = require("os")
const path = require("path")
const { mkdtemp } = require("fs/promises")

const fs = require("fs-extra")
const set = require("lodash.set")
const qs = require("qs")

const loadStructuredConfig = require("~common/utils/load-structured-config")
const writeKubeconfig = require("~common/utils/write-kubeconfig")
const getGitRef = require("~common/utils/get-git-ref")
const getGitSha = require("~common/utils/get-git-sha")
const getGitUrl = require("~common/utils/get-git-url")
const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const cleanGitRef = require("~common/utils/clean-git-ref")
const refEnv = require("~common/utils/ref-env")
const yaml = require("~common/utils/yaml")
const asyncShell = require("~common/utils/async-shell")
const deepmerge = require("~common/utils/deepmerge")
const logger = require("~common/utils/logger")

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
    repositoryName: {
      defaultFunction: (config) => config.gitRepositoryName,
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
      defaultFunction: () => "",
    },
    inlineConfig: {
      env: "KS_INLINE_CONFIG",
      option: "inline-config",
    },
    configSet: {
      env: "KS_INLINE_CONFIG_SET",
      envParser: (str) => yaml.load(str),
      option: "config-set",
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
    buildRootPath: {
      env: "KS_BUILD_ROOT_PATH",
      defaultFunction: () => path.join(os.tmpdir(), "kontinuous"),
    },
    buildPath: {
      env: "KS_BUILD_PATH",
      defaultFunction: async (config) => {
        const { buildRootPath } = config
        await fs.ensureDir(buildRootPath)
        return mkdtemp(path.join(buildRootPath, "build-"))
      },
    },
    buildProjectPath: {
      defaultFunction: (config) =>
        path.join(config.buildPath, "charts", "project"),
    },
    environment: {
      env: "KS_ENVIRONMENT",
      option: "E",
      defaultFunction: (config) => refEnv(config.gitBranch),
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
    upload: {
      env: "KS_BUILD_UPLOAD",
      option: "upload",
    },
    uploadUrl: {
      env: "KS_BUILD_UPLOAD_URL",
      option: "upload-url",
      defaultFunction: (config) => {
        const { webhookUri, webhookToken } = config
        if (!(webhookUri && webhookToken)) {
          return
        }
        const query = qs.stringify({
          repository: config.gitRepositoryUrl,
          branch: config.gitBranch,
          commit: config.gitSha,
          token: webhookToken,
        })
        return `${webhookUri}/api/v1/oas/artifacts/upload?${query}`
      },
    },
    downloadUrl: {
      env: "KS_DOWNLOAD_URL",
      option: "download-url",
      defaultFunction: (config) => {
        const { webhookUri, webhookToken } = config
        if (!(webhookUri && webhookToken)) {
          return
        }
        const query = qs.stringify({
          repository: config.gitRepositoryUrl,
          branch: config.gitBranch,
          commit: config.gitSha,
          token: webhookToken,
        })
        return `${webhookUri}/api/v1/oas/artifacts/download?${query}`
      },
    },
    statusUrl: {
      env: "KS_DEPLOY_STATUS_URL",
      option: "status-url",
      defaultFunction: (config) => {
        const { webhookUri, webhookToken } = config
        if (!(webhookUri && webhookToken)) {
          return
        }
        const query = qs.stringify({
          repository: config.gitRepositoryUrl,
          branch: config.gitBranch,
          commit: config.gitSha,
          token: webhookToken,
        })
        return `${webhookUri}/api/v1/oas/artifacts/status?${query}`
      },
    },
    ciNamespace: {
      option: "ci-namespace",
      env: "KS_CI_NAMESPACE",
      defaultFunction: (config) =>
        config.repositoryName ? `${config.repositoryName}-ci` : null,
    },
    kubeconfigPath: {
      defaultFunction: () => writeKubeconfig(),
    },
    kubeconfigContext: {
      option: "kubeconfigContext",
      env: "KS_KUBECONFIG_CONTEXT",
      defaultFunction: async (config, { options }) => {
        const { environment } = config
        const { kubeconfigContextNoDetect } = options
        let kubeconfigContext
        if (kubeconfigContextNoDetect) {
          kubeconfigContext = await asyncShell("kubectl config current-context")
        } else if (environment === "prod") {
          kubeconfigContext = "prod"
        } else {
          kubeconfigContext = "dev"
        }
        return kubeconfigContext
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

  if (config.inlineConfig) {
    const inlineConfig = yaml.load(config.inlineConfig)
    deepmerge(config, inlineConfig)
  }

  const { configSet } = config
  if (configSet) {
    if (Array.isArray(configSet)) {
      for (const s of configSet) {
        const index = s.indexOf("=")
        if (index === -1) {
          logger.warn("bad format for --config-set option, expected: foo=bar")
          continue
        }
        const key = s.slice(0, index)
        const val = s.slice(index + 1)
        set(config, `${key}`, yaml.parse(val))
      }
    } else {
      for (const [key, val] of Object.entries(configSet)) {
        set(config, key, val)
      }
    }
  }

  return config
}
