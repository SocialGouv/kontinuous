const os = require("os")
const path = require("path")
const { mkdtemp } = require("fs/promises")

const fs = require("fs-extra")
const set = require("lodash.set")
const defaultsDeep = require("lodash.defaultsdeep")
const qs = require("qs")

const configDependencyKey = require("~common/utils/config-dependency-key")

const lowerKeys = require("~common/utils/lower-keys")
const ctx = require("../ctx")
const patternMatch = require("../utils/pattern-match")
const loadStructuredConfig = require("../utils/load-structured-config")
const getGitRef = require("../utils/get-git-ref")
const getGitSha = require("../utils/get-git-sha")
const getGitUrl = require("../utils/get-git-url")
const getGitRemoteDefaultBranch = require("../utils/get-git-remote-default-branch")
const repositoryFromGitUrl = require("../utils/repository-from-git-url")
const cleanGitRef = require("../utils/clean-git-ref")
const yaml = require("../utils/yaml")
const asyncShell = require("../utils/async-shell")
const deepmerge = require("../utils/deepmerge")
const logger = require("../utils/logger")
const refEnv = require("../utils/ref-env")
const slug = require("../utils/slug")
const normalizeRepositoryUrl = require("../utils/normalize-repository-url")

const gitEnv = require("../utils/git-env")
const loadDependencies = require("./load-dependencies")
const recurseDependency = require("./recurse-dependencies")

const { version } = require(`${__dirname}/../package.json`)

const mergeProjectsAndOrganizations = (config) => {
  const { organizations, projects, projectName, gitRepositoryName } = config
  if (projects && projects[projectName]) {
    const projectConfig = projects[projectName]
    const { organization } = projectConfig
    if (organization && organizations[organization]) {
      const org = organizations[organization]
      deepmerge(config, org)
    }
    deepmerge(config, projectConfig)
    const repositoryConfig = projectConfig.repositories?.[gitRepositoryName]
    if (repositoryConfig) {
      deepmerge(config, repositoryConfig)
    }
  }
}

const defaultRepositoryProvider = "https://github.com" // degit/tiged like

module.exports = async (opts = {}, inlineConfigs = [], rootConfig = {}) => {
  const env = ctx.get("env") || process.env

  const rootConfigOverride = {
    kontinuousHomeDir: {
      env: "KS_HOMEDIR",
      defaultFunction: () => {
        const homeOrTmpDir = os.homedir() || os.tmpdir()
        return `${homeOrTmpDir}/.kontinuous`
      },
    },
    workspacePath: {
      env: "KS_WORKSPACE_PATH",
      option: "cwd",
      default: process.cwd(),
    },
    workspaceSubPath: {
      env: "KS_WORKSPACE_SUBPATH",
      option: "subpath",
      default: ".kontinuous",
    },
    workspaceKsPath: {
      defaultFunction: (config) =>
        path.join(config.workspacePath, config.workspaceSubPath),
    },
    git: {
      env: "KS_GIT",
      envParser: (str) => yaml.load(str),
      defaultFunction: async (config) => {
        const { workspacePath } = config
        try {
          await asyncShell("git status", { cwd: workspacePath })
          return true
        } catch (_err) {
          return false
        }
      },
    },
    gitRequired: {
      env: "KS_GIT_REQUIRED",
      envParser: (str) => yaml.load(str),
    },
    gitRepositoryUrl: {
      defaultFunction: async (config, { options, env: environ }) => {
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
        if (config.git) {
          try {
            const gitUrl = await getGitUrl(config.workspacePath)
            return gitUrl
          } catch (err) {
            if (config.gitRequired) {
              throw err
            }
          }
        }
        logger.warn(
          `no git repository url defined and can't be inferred, default to ""`
        )
        return ""
      },
    },
    gitRepository: {
      defaultFunction: async (config) => {
        if (config.gitRepositoryUrl) {
          try {
            const repo = await repositoryFromGitUrl(config.gitRepositoryUrl)
            return repo
          } catch (err) {
            if (config.gitRequired) {
              throw err
            }
          }
        }
        const dirname = path.basename(config.workspacePath)
        logger.warn(
          `no git repository url defined, repository will default to dirname "${dirname}"`
        )
        return dirname
      },
    },
    gitBranchRetrieveDefaultFromRemote: {
      env: "KS_GIT_BRANCH_RETRIEVE_DEFAULT_FROM_REMOTE",
      option: "remote",
      default: false,
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
        } else if (config.git) {
          ref = await getGitRef(config.workspacePath)
        } else if (config.gitBranchRetrieveDefaultFromRemote) {
          ref = await getGitRemoteDefaultBranch(config.gitRepositoryUrl)
        } else {
          logger.trace(
            `no git branch defined and can't be inferred, default to "imaginary"`
          )
          ref = "imaginary"
        }
        return cleanGitRef(ref)
      },
    },
    gitSha: {
      env: "KS_GIT_SHA",
      option: "commit",
      defaultFunction: async (config) => {
        if (config.git) {
          try {
            const sha1 = await getGitSha(config.workspacePath)
            return sha1
          } catch (err) {
            if (config.gitRequired) {
              throw err
            }
          }
        }
        logger.trace(
          `no git sha defined and can't be inferred, default to "0000000000000000000000000000000000000000"`
        )
        return "0000000000000000000000000000000000000000"
      },
    },
    gitRepositoryName: {
      defaultFunction: (config) => path.basename(config.gitRepository),
    },
    repositoryName: {
      defaultFunction: (config) => config.gitRepositoryName,
    },
    refLabelKey: {
      default: "kontinuous/ref",
    },
    refLabelValue: {
      defaultFunction: (config) => slug(config.gitBranch),
    },
    deploymentEnvLabelKey: {
      default: "kontinuous/deployment.env",
    },
    deploymentEnvLabelValue: {
      defaultFunction: (config) => {
        const { repositoryName, chart, gitBranch } = config
        const charts = chart?.join(",")
        return slug(
          `${repositoryName}-${gitBranch}${charts ? `-${charts}` : ""}`
        )
      },
    },
    deploymentLabelKey: {
      default: "kontinuous/deployment",
    },
    deploymentLabelForceNewDeploy: {
      default: true,
      env: "KS_FORCE_NEW_DEPLOY",
      envParser: (str) => yaml.load(str),
    },
    deploymentLabelValue: {
      defaultFunction: (config) => {
        const {
          repositoryName,
          chart,
          gitBranch,
          gitSha,
          deploymentLabelForceNewDeploy,
        } = config
        const deploymentId = !deploymentLabelForceNewDeploy
          ? gitSha
          : Math.floor(Date.now() / 1000)

        const slugParts = [repositoryName, gitBranch, deploymentId]
        const charts = chart?.join(",")
        if (charts) {
          slugParts.push(charts)
        }
        return slug(slugParts.join("-"))
      },
    },
  }
  const configOverride = {
    kontinuousPath: {
      env: "KS_KONTINUOUS_PATH",
      default: path.resolve(
        `${path.dirname(await fs.realpath(process.argv[1]))}/..`
      ),
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
      transform: async (buildPath) => {
        await fs.ensureDir(buildPath)
        return buildPath
      },
    },
    buildProjectPath: {
      defaultFunction: (config) =>
        path.join(config.buildPath, "charts", "project"),
    },
    environmentPatterns: {
      transform: (value) => ({
        ...{
          prod: "v([0-9])*.([0-9])*.([0-9])*",
          preprod: ["main", "master"],
          dev: "**",
        },
        ...(value || {}),
      }),
    },
    environment: {
      env: "KS_ENVIRONMENT",
      option: "E",
      defaultFunction: (config) =>
        refEnv(config.gitBranch, config.environmentPatterns),
    },
    projectName: {
      env: "KS_PROJECT_NAME",
    },
    webhookToken: {
      option: "webhook-token",
      env: "KS_WEBHOOK_TOKEN",
      defaultFunction: (config) => config.webhook?.token,
    },
    webhookUri: {
      option: "webhook-uri",
      env: "KS_WEBHOOK_URI",
      defaultFunction: (config) => {
        if (config.webhook?.uri) {
          return config.webhook.uri
        }
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
          project: config.projectName,
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
          project: config.projectName,
          repository: config.gitRepositoryUrl,
          branch: config.gitBranch,
          commit: config.gitSha,
          token: webhookToken,
        })
        return `${webhookUri}/api/v1/oas/artifacts/download?${query}`
      },
    },
    editor: {
      env: "KS_EDITOR",
      options: "editor",
    },
    deployWithPlugin: {
      env: "KS_DEPLOY_WITH",
      option: "deploy-with",
      defaultFunction: (config) => {
        config.deployWithPluginIsDefault = true
        return "kapp"
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
          project: config.projectName,
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
        config.repositoryName
          ? `${config.projectName || config.repositoryName}-ci`
          : undefined,
    },
    isLocal: {
      env: "KS_ISLOCAL",
      default: false,
    },
    clusterEnvironments: {
      transform: (value) => ({
        ...{
          prod: "prod",
          dev: ["preprod", "dev"],
        },
        ...(value || {}),
      }),
    },
    cluster: {
      env: "KS_CLUSTER",
      defaultFunction: (config) => {
        const { environment, clusterEnvironments } = config
        if (!environment) {
          return
        }
        for (const [cluster, envPatterns] of Object.entries(
          clusterEnvironments
        )) {
          if (envPatterns && patternMatch(environment, envPatterns)) {
            return cluster
          }
        }
      },
    },
    kubeconfig: {
      option: "kubeconfig",
      env: ["KS_KUBECONFIG", "KUBECONFIG"],
    },
    kubeconfigContextEnvironments: {
      defaultFunction: (config) => config.clusterEnvironments,
    },
    kubeconfigContextNoDetect: {
      option: "kubeconfigContextNoDetect",
      env: "KS_KUBECONFIG_CONTEXT_NO_DETECT",
    },
    kubeconfigContext: {
      option: "kubeconfigContext",
      env: "KS_KUBECONFIG_CONTEXT",
      defaultFunction: (config) => {
        const {
          isLocal,
          kubeconfigContextNoDetect,
          environment,
          kubeconfigContextEnvironments,
        } = config
        if (!isLocal || kubeconfigContextNoDetect || !environment) {
          return
        }
        for (const [context, envPatterns] of Object.entries(
          kubeconfigContextEnvironments
        )) {
          if (envPatterns && patternMatch(environment, envPatterns)) {
            return context
          }
        }
      },
    },
    deployTimeout: {
      option: "timeout",
      env: "KS_DEPLOY_TIMEOUT",
      default: "15m",
    },
    links: {
      transform: async (links = {}) => {
        links = lowerKeys(links)
        if (!links["socialgouv/kontinuous"]) {
          const real = await fs.realpath(process.argv[1])
          if (real.endsWith("packages/kontinuous/bin/kontinuous")) {
            links["socialgouv/kontinuous"] = path.resolve(
              `${path.dirname(real)}/../../..`
            )
          }
        }
        return links
      },
    },
    private: {
      option: "private",
      env: "KS_PRIVATE",
      envParser: (str) => yaml.load(str),
      default: false,
    },
    deployKeyFile: {
      option: "deployKey",
      env: "KS_DEPLOY_KEY_FILE",
      defaultFunction: (config) => {
        if (config.private) {
          return "~/.ssh/id_rsa"
        }
      },
    },
    deployKeySecretEnabled: {
      env: "KS_DEPLOY_KEY_SECRET_ENABLED",
      defaultFunction: (config) => !!config.private,
    },
    deployKeySecretName: {
      env: "KS_DEPLOY_KEY_SECRET_NAME",
      default: null,
    },
    disableDiff: {
      env: "KS_DISABLE_DIFF",
    },
    diffBranch: {
      defaultFunction: async (config) => {
        if (!config.git || config.disableDiff || !config.gitRepositoryUrl) {
          return
        }
        const { gitBranch, gitRepositoryUrl, workspacePath } = config
        let localRemoteExists
        if (
          await fs.pathExists(
            `${workspacePath}/.git/refs/remotes/origin/${gitBranch}`
          )
        ) {
          localRemoteExists = true
        } else {
          const { deployKeyFile } = config
          const procEnv = gitEnv({ deployKey: deployKeyFile })

          let remoteExists
          try {
            const repoUrl = deployKeyFile
              ? normalizeRepositoryUrl(gitRepositoryUrl, "ssh")
              : gitRepositoryUrl
            await asyncShell(
              `git ls-remote --exit-code --heads ${repoUrl} ${gitBranch}`,
              { env: procEnv }
            )
            remoteExists = true
          } catch (error) {
            if (error.code !== 2) {
              throw error
            }
          }
          if (remoteExists) {
            await asyncShell(`git fetch origin ${gitBranch}`, { env: procEnv })
            localRemoteExists = true
          }
        }

        let diffBranch
        if (localRemoteExists) {
          diffBranch = gitBranch
        } else {
          diffBranch = "HEAD"
        }

        return diffBranch
      },
    },
    commits: {
      env: "KS_COMMITS",
      envParser: (str) => yaml.load(str),
      defaultFunction: async (config) => {
        const commits = {
          added: [],
          modified: [],
          removed: [],
        }
        if (!config.git || config.disableDiff || !config.gitRepositoryUrl) {
          return commits
        }
        const { gitBranch } = config
        const procEnv = gitEnv({ deployKey: config.deployKeyFile })
        try {
          const { diffBranch } = config

          const diffOutput = await asyncShell(
            `git diff --name-status remotes/origin/${diffBranch}..${gitBranch}`,
            { env: procEnv }
          )
          const diff = diffOutput.split("\n").map((line) => {
            const [status, file] = line.trim().split(/\t|\s+/)
            return [status, file]
          })
          for (const [status, file] of diff) {
            switch (status) {
              case "A":
                commits.added.push(file)
                break
              case "D":
                commits.removed.push(file)
                break
              case "M":
                commits.modified.push(file)
                break
              case "R":
                commits.added.push(file)
                commits.removed.push(file)
                break
              default:
            }
          }
        } catch (error) {
          if (error.code !== 128) {
            logger.error({ error }, "unable to git diff")
            throw error
          }
        }
        return commits
      },
    },
    changedPaths: {
      defaultFunction: (config) => {
        const { commits } = config
        return Object.values(commits).flatMap((files) => files)
      },
    },
    event: {
      env: "KS_EVENT",
      options: "event",
      default: "pushed",
    },
    ignoreProjectTemplates: {
      env: "KS_IGNORE_PROJECT_TEMPLATES",
      envParser: (str) => yaml.load(str),
      option: "ignoreProjectTemplates",
      default: false,
    },
    externalBinForceDownload: {
      env: "KS_EXTERNAL_BIN_FORCE_DOWNLOAD",
      envParser: (str) => yaml.load(str),
      default: true,
    },
    disablePlugin: {
      env: "KS_DISABLE_PLUGIN",
      envParser: (str) => yaml.load(str),
      option: "disable-plugin",
      default: [],
    },
    disableStep: {
      env: "KS_DISABLE_STEP",
      envParser: (str) => yaml.load(str),
      option: "disable-step",
      default: [],
    },
    noValidate: {
      env: "KS_NO_VALIDATE",
      envParser: (str) => yaml.load(str),
      option: "no-validate",
    },
  }

  rootConfig = await loadStructuredConfig({
    rootConfig,
    inlineConfigs,
    configOverride: rootConfigOverride,
    options: opts,
    env,
  })

  const configDirs = []
  const { kontinuousHomeDir } = rootConfig
  if (kontinuousHomeDir) {
    configDirs.push(kontinuousHomeDir)
  }
  configDirs.push(rootConfig.workspaceKsPath)

  const config = await loadStructuredConfig({
    rootConfig,
    configBasename: "config",
    configDirs,
    configPreCompilers: [mergeProjectsAndOrganizations],
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

  let { dependencies } = config
  if (!dependencies) {
    dependencies = {}
    config.dependencies = dependencies
  }
  dependencies = Object.entries(dependencies)
    .filter(([_key, value]) => value.enabled !== false && value.import)
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})

  logger.info(`📂 buildPath: file://${config.buildPath}`)

  await loadDependencies(config)

  await recurseDependency({
    config,
    beforeChildren: async ({ definition }) => {
      const { config: extendsConfig } = definition
      if (!extendsConfig) {
        return
      }
      defaultsDeep(config, extendsConfig)
      if (extendsConfig.deployWithPlugin && config.deployWithPluginIsDefault) {
        config.deployWithPlugin = extendsConfig.deployWithPlugin
        config.deployWithPluginIsDefault = false
      }
    },
  })

  await recurseDependency({
    config,
    beforeChildren: async ({ definition, target }) => {
      const deployWithDir = `${target}/deploy-with`
      if (!(await fs.pathExists(deployWithDir))) {
        return
      }
      const depoyWithFiles = await fs.readdir(deployWithDir)

      if (!definition.deployWith) {
        definition.deployWith = {}
      }
      const { deployWith } = definition
      for (let depoyWithFile of depoyWithFiles) {
        const ext = path.extname(depoyWithFile)
        if (ext) {
          depoyWithFile = depoyWithFile.slice(
            0,
            depoyWithFile.length - ext.length
          )
        }
        const deployWithKey = configDependencyKey(depoyWithFile)
        if (!deployWith[deployWithKey]) {
          deployWith[deployWithKey] = {}
        }
        deployWith[deployWithKey].enabled = deployWithKey.includes(
          config.deployWithPlugin
        )
      }
    },
  })

  return config
}
