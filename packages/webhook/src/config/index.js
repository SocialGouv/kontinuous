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

  const supertoken = process.env.KUBEWEBHOOK_SUPERTOKEN

  const ignoreUserAgents = (
    process.env.KUBEWEBHOOK_HTTPLOGGER_IGNOREUSERAGENTS || ""
  ).split(",")

  const pipelineImageTag = process.env.KUBEWEBHOOK_PIPELINE_IMAGE_TAG || "v1"
  const pipelineImage =
    process.env.KUBEWEBHOOK_PIPELINE_IMAGE || "ghcr.io/socialgouv/kontinuous"
  const pipelineCheckoutImage =
    process.env.KUBEWEBHOOK_PIPELINE_CHECKOUT_IMAGE ||
    "ghcr.io/socialgouv/kontinuous/degit"
  const pipelineCheckoutImageTag =
    process.env.KUBEWEBHOOK_PIPELINE_CHECKOUT_IMAGE_TAG || "v1"

  const serviceName = `kontinuous webhook server v${kontinuousVersion}`

  const allowAllOnCiNamespaceEnabled =
    process.env.KUBEWEBHOOK_ALLOW_ALL_ON_CI_NAMESPACE_ENABLED === "true"
  const allowAllOnCiNamespaceTemplate =
    process.env.KUBEWEBHOOK_ALLOW_ALL_ON_CI_NAMESPACE_TEMPLATE ||
    "${project}-ci"

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
      allowAllOnCiNamespace: {
        enabled: allowAllOnCiNamespaceEnabled,
        template: allowAllOnCiNamespaceTemplate,
      },
    },
    microserviceOapi: { serviceName },
    logger: {
      level: "debug",
    },
    httpLogger: {
      ignoreUserAgents,
    },
  }

  await loadFinalConfig(config)

  return config
}
