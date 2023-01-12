const fs = require("fs-extra")
const kontinuousVersion = require("~common/utils/kontinuous-version")

const normalizeRepositoryKey = require("~common/utils/normalize-repository-key")
const normalizeRepositoryUrl = require("~common/utils/normalize-repository-url")
const yaml = require("~common/utils/yaml")

const oasUri = require("./oas-uri")
const loadFinalConfig = require("./load-final-config")

module.exports = async function createConfig() {
  const configPath =
    process.env.KUBEWEBHOOK_CONFIG_PATH || `${process.cwd()}/config.yaml`
  const reloadableSecretsRootPath =
    process.env.KUBEWEBHOOK_RELOADABLE_SECRETS_ROOT_PATH ||
    `/secrets/reloadable`
  const tokensSecretDir = process.env.KUBEWEBHOOK_TOKENS_SECRET_DIR || `tokens`

  let yamlConfig = {}
  if (await fs.pathExists(configPath)) {
    const yamlContent = await fs.readFile(configPath, { encoding: "utf-8" })
    yamlConfig = yaml.load(yamlContent)
  }

  const {
    tokens: projectTokens = [],
    kubeconfigs: projectKubeconfigs = [],
    rootKubeconfigs: fileRootKubeconfigs = [],
    repositories: projectRepositories = [],
  } = yamlConfig

  const tokensFromConfig = {}
  for (const { project, file } of projectTokens) {
    if (!tokensFromConfig[project]) {
      tokensFromConfig[project] = []
    }
    const content = await fs.readFile(file, { encoding: "utf-8" })
    tokensFromConfig[project].push(content)
  }

  const kubeconfigs = {}
  for (const { project, file, cluster } of projectKubeconfigs) {
    if (!kubeconfigs[project]) {
      kubeconfigs[project] = {}
    }
    kubeconfigs[project][cluster] = file
  }

  const rootKubeconfigs = {}
  for (const { file, cluster } of fileRootKubeconfigs) {
    rootKubeconfigs[cluster] = file
  }

  const repositories = {}
  for (const {
    project,
    repository,
    private: isPrivate,
    deployKeyFile,
    deployKeyCiSecretName,
  } of projectRepositories) {
    const repo = {
      repository,
      https: normalizeRepositoryUrl(repository, "https"),
      ssh: normalizeRepositoryUrl(repository, "ssh"),
      private: isPrivate,
      deployKeyCiSecretName,
      project,
    }
    if (deployKeyFile) {
      repo.deployKey = deployKeyFile
    }
    const key = normalizeRepositoryKey(repository)
    repositories[key] = repo
  }

  const { env } = process

  const supertoken = env.KUBEWEBHOOK_SUPERTOKEN

  const ignoreUserAgents = (
    env.KUBEWEBHOOK_HTTPLOGGER_IGNOREUSERAGENTS || ""
  ).split(",")

  const pipelineImageTag = env.KUBEWEBHOOK_PIPELINE_IMAGE_TAG || "v1"
  const pipelineImage =
    env.KUBEWEBHOOK_PIPELINE_IMAGE || "ghcr.io/socialgouv/kontinuous"
  const pipelineCheckoutImage =
    env.KUBEWEBHOOK_PIPELINE_CHECKOUT_IMAGE ||
    "ghcr.io/socialgouv/kontinuous/degit"
  const pipelineCheckoutImageTag =
    env.KUBEWEBHOOK_PIPELINE_CHECKOUT_IMAGE_TAG || "v1"

  const serviceName = `kontinuous webhook server v${kontinuousVersion}`

  const ciNamespaceAllowAll = env.KUBEWEBHOOK_CI_NAMESPACE_ALLOW_ALL === "true"
  const ciNamespaceTemplate =
    env.KUBEWEBHOOK_CI_NAMESPACE_TEMPLATE || "${project}-ci"

  const ciNamespaceMountKubeconfigDefault =
    env.KUBEWEBHOOK_CI_NAMESPACE_MOUNT_KUBECONFIG_DEFAULT === "true"
  const ciNamespaceKubeconfigSecretName =
    env.KUBEWEBHOOK_CI_NAMESPACE_KUBECONFIG_SECRET_NAME || "kubeconfig"

  const ciNamespaceMountSecretsDefault = JSON.parse(
    env.KUBEWEBHOOK_CI_NAMESPACE_MOUNT_SECRETS_DEFAULT || "[]"
  )
  const ciNamespaceServiceAccountNameDefault =
    env.KUBEWEBHOOK_CI_NAMESPACE_SERVICE_ACCOUNT_NAME_DEFAULT

  const surviveOnBrokenCluster =
    env.KUBEWEBHOOK_SURVIVE_ON_BROKEN_CLUSTER === "true"

  const sentryDsn = env.KUBEWEBHOOK_SENTRY_DSN

  const config = {
    project: {
      oas: {
        uri: oasUri(),
      },
      secrets: {
        tokensFromConfig,
        supertoken,
        kubeconfigs,
        rootKubeconfigs,
      },
      paths: {
        reloadableSecretsRootPath,
        tokensSecretDir,
      },
      repositories,
      pipelineImage,
      pipelineImageTag,
      pipelineCheckoutImage,
      pipelineCheckoutImageTag,
      ciNamespace: {
        allowAll: ciNamespaceAllowAll,
        template: ciNamespaceTemplate,
        mountKubeconfigDefault: ciNamespaceMountKubeconfigDefault,
        serviceAccountNameDefault: ciNamespaceServiceAccountNameDefault,
        kubeconfigSecretName: ciNamespaceKubeconfigSecretName,
        mountSecretsDefault: ciNamespaceMountSecretsDefault,
      },
      surviveOnBrokenCluster,
    },
    microserviceOapi: { serviceName },
    logger: {
      level: "debug",
    },
    httpLogger: {
      ignoreUserAgents,
    },
    sentry: {
      dsn: sentryDsn,
    },
  }

  await loadFinalConfig(config)

  return config
}
