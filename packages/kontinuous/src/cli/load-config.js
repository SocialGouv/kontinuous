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

const { version } = require(`${__dirname}/../../package.json`)

module.exports = async (opts = {}) => {
  const configDirs = []
  const homedir = os.homedir()
  if (homedir) {
    configDirs.push(`${homedir}/.kontinuous`)
  }
  const cwd = opts.cwd || process.cwd()
  configDirs.push(`${cwd}/.kontinuous`)

  const configOverride = {
    kontinuousPath: {
      env: "KS_KONTINUOUS_PATH",
      default: path.resolve(`${__dirname}/../..`),
    },
    version: {
      default: version,
    },
    workspacePath: {
      option: "cwd",
      default: process.cwd(),
    },
    chart: {
      env: "KS_CHART",
      envParser: (str) => (str[0] === "[" ? JSON.parse(str) : str.split(",")),
      option: "chart",
    },
    tree: {
      env: "KS_DISPLAY_TREE",
      option: "tree",
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
        path.join(config.buildPath, "dependencies", "project"),
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
    workspaceSubPath: {
      default: "/.kontinuous",
    },
    workspaceKsPath: {
      defaultFunction: (config) =>
        path.join(config.workspacePath, config.workspaceSubPath),
    },
  }

  const config = await loadStructuredConfig({
    configBasename: "config",
    configDirs,
    configOverride,
    options: opts,
    env: process.env,
  })

  return config
}
