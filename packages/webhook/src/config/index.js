const fs = require("fs-extra")
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

  const tokens = {}
  const kubeconfigs = {}

  const { projects = {} } = yamlConfig
  for (const [projectName, projectConfig] of Object.entries(projects)) {
    const {
      tokens: projectTokens,
      clusters,
      deployKeyFile,
      private,
      deployKeySecretName,
    } = projectConfig
  }

  // const secretsRootPath = "/secrets"
  // if (await fs.pathExists(secretsRootPath)) {
  //   const secretProjectDirs = await fs.readdir(secretsRootPath)
  //   for (const secretProjectDir of secretProjectDirs) {
  //     const secretProjectDirPath = `${secretsRootPath}/${secretProjectDir}`
  //     if (!(await fs.stat(secretProjectDirPath)).isDirectory()) {
  //       continue
  //     }
  //     const secretTokenDir = `${secretProjectDirPath}/tokens`
  //     if (!(await fs.pathExists(secretTokenDir))) {
  //       continue
  //     }
  //     const tokenFiles = await fs.readdir(secretTokenDir)
  //     tokens[secretProjectDir] = []
  //     for (const tokenFile of tokenFiles) {
  //       const secretTokenFile = `${secretTokenDir}/${tokenFile}/token`
  //       if (!(await fs.stat(secretTokenFile)).isFile()) {
  //         continue
  //       }
  //       const token = await fs.readFile(secretTokenFile, {
  //         encoding: "utf-8",
  //       })
  //       tokens[secretProjectDir].push(token)
  //     }

  //     const secretKubeconfigDir = `${secretProjectDirPath}/kubeconfig`
  //     const kubeconfigClusters = await fs.readdir(secretKubeconfigDir)
  //     kubeconfigs[secretProjectDir] = {}
  //     for (const kubeconfigCluster of kubeconfigClusters) {
  //       const secretKubeconfigFile = `${secretKubeconfigDir}/${kubeconfigCluster}/kubeconfig`
  //       kubeconfigs[secretProjectDir][kubeconfigCluster] = secretKubeconfigFile
  //     }
  //   }
  // }

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
