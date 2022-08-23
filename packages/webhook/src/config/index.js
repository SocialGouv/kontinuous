const fs = require("fs-extra")

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
    const content = await fs.readFile(file, { encoding: "utf-8" })
    kubeconfigs[project][cluster] = content
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
      const content = await fs.readFile(deployKeyFile, { encoding: "utf-8" })
      repo.deployKey = content
    }
    const key = normalizeRepositoryKey(repository)
    repositories[key] = repo
  }

  const supertoken = process.env.KUBEWEBHOOK_SUPERTOKEN

  const ignoreUserAgents = (
    process.env.KUBEWEBHOOK_HTTPLOGGER_IGNOREUSERAGENTS || ""
  ).split(",")

  const pipelineImage =
    process.env.KUBEWEBHOOK_PIPELINE_IMAGE || "ghcr.io/socialgouv/kontinuous:1"
  const pipelineCheckoutImage =
    process.env.KUBEWEBHOOK_PIPELINE_CHECKOUT_IMAGE ||
    "ghcr.io/socialgouv/kontinuous/degit:1"

  const config = {
    project: {
      oas: {
        uri: oasUri(),
      },
      secrets: {
        tokens,
        supertoken,
        kubeconfigs,
      },
      repositories,
      pipelineImage,
      pipelineCheckoutImage,
    },
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
