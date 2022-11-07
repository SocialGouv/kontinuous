const fs = require("fs-extra")
const kontinuousVersion = require("~common/utils/kontinuous-version")

const normalizeRepositoryKey = require("~common/utils/normalize-repository-key")
const normalizeRepositoryUrl = require("~common/utils/normalize-repository-url")
const yaml = require("~common/utils/yaml")

const oasUri = require("./oas-uri")

module.exports = async function createConfig() {
  const configPath =
    process.env.KUBEWEBHOOK_CONFIG_PATH || `${process.cwd()}/config.yaml`

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

  const tokens = {}
  for (const { project, file } of projectTokens) {
    if (!tokens[project]) {
      tokens[project] = []
    }
    const content = await fs.readFile(file, { encoding: "utf-8" })
    tokens[project].push(content)
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

  const pipelineImage =
    process.env.KUBEWEBHOOK_PIPELINE_IMAGE ||
    "ghcr.io/socialgouv/kontinuous:v1.95.11"
  const pipelineCheckoutImage =
    process.env.KUBEWEBHOOK_PIPELINE_CHECKOUT_IMAGE ||
    "ghcr.io/socialgouv/kontinuous/degit:v1.95.11"

  const serviceName = `kontinuous webhook server v${kontinuousVersion}`
  const config = {
    project: {
      oas: {
        uri: oasUri(),
      },
      secrets: {
        tokens,
        supertoken,
        kubeconfigs,
        rootKubeconfigs,
      },
      repositories,
      pipelineImage,
      pipelineCheckoutImage,
    },
    microserviceOapi: { serviceName },
    logger: {
      level: "debug",
    },
    httpLogger: {
      hideSecrets: [
        ...Object.values(tokens).flatMap((values) => values),
        ...(supertoken ? [supertoken] : []),
      ],
      ignoreUserAgents,
    },
  }

  return config
}
