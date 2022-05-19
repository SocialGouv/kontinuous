const os = require("os")
const path = require("path")
const { mkdtemp } = require("fs/promises")

const loadStructuredConfig = require("~common/utils/load-structured-config")

const getGitRef = require("~common/utils/get-git-ref")
const getGitSha = require("~common/utils/get-git-sha")
const getGitRepository = require("~common/utils/get-git-repository")
const getGitUrl = require("~common/utils/get-git-url")
const refEnv = require("~common/utils/ref-env")
const yaml = require("~common/utils/yaml")

const ctx = require("~/ctx")

const { version } = require(`${__dirname}/../../package.json`)

const configAsDefaultOverride = (config) =>
  Object.entries(config).reduce((acc, [key, value]) => {
    acc[key] = { default: value }
    return acc
  }, {})

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
  }
  const rootConfig = await loadStructuredConfig({
    configOverride: rootConfigOverride,
    options: opts,
    env,
  })

  const configOverride = {
    ...configAsDefaultOverride(rootConfig),
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
    gitRef: {
      env: "KS_GIT_REF",
      defaultFunction: (config) => getGitRef(config.workspacePath),
    },
    gitSha: {
      env: "KS_GIT_SHA",
      defaultFunction: (config) => getGitSha(config.workspacePath),
    },
    gitRepositoryUrl: {
      env: "KS_GIT_REPOSITORY_URL",
      defaultFunction: (config) => getGitUrl(config.workspacePath),
    },
    gitRepository: {
      env: "KS_GIT_REPOSITORY",
      defaultFunction: (config) =>
        getGitRepository(config.workspacePath, config.url),
    },
    environment: {
      env: "KS_ENVIRONMENT",
      option: "E",
      defaultFunction: (config) => refEnv(config.gitRef),
    },
  }

  const configDirs = []
  const homedir = os.homedir()
  if (homedir) {
    configDirs.push(`${homedir}/.kontinuous`)
  }
  configDirs.push(rootConfig.workspaceKsPath)

  const config = await loadStructuredConfig({
    configBasename: "config",
    configDirs,
    configOverride,
    options: opts,
    env,
  })

  return config
}
