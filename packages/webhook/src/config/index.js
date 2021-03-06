const fs = require("fs-extra")

const oasUri = require("./oas-uri")

module.exports = async function createConfig() {
  const secretsRootPath = "/secrets"
  const tokens = {}
  const kubeconfigs = {}
  if (await fs.pathExists(secretsRootPath)) {
    const secretProjectDirs = await fs.readdir(secretsRootPath)
    for (const secretProjectDir of secretProjectDirs) {
      const secretProjectDirPath = `${secretsRootPath}/${secretProjectDir}`
      if (!(await fs.stat(secretProjectDirPath)).isDirectory()) {
        continue
      }
      const secretTokenDir = `${secretProjectDirPath}/tokens`
      if (!(await fs.pathExists(secretTokenDir))) {
        continue
      }
      const tokenFiles = await fs.readdir(secretTokenDir)
      tokens[secretProjectDir] = []
      for (const tokenFile of tokenFiles) {
        const secretTokenFile = `${secretTokenDir}/${tokenFile}/token`
        if (!(await fs.stat(secretTokenFile)).isFile()) {
          continue
        }
        const token = await fs.readFile(secretTokenFile, {
          encoding: "utf-8",
        })
        tokens[secretProjectDir].push(token)
      }

      const secretKubeconfigDir = `${secretProjectDirPath}/kubeconfig`
      const kubeconfigClusters = await fs.readdir(secretKubeconfigDir)
      kubeconfigs[secretProjectDir] = {}
      for (const kubeconfigCluster of kubeconfigClusters) {
        const secretKubeconfigFile = `${secretKubeconfigDir}/${kubeconfigCluster}/kubeconfig`
        kubeconfigs[secretProjectDir][kubeconfigCluster] = secretKubeconfigFile
      }
    }
  }

  const supertoken = process.env.KUBEWEBHOOK_SUPERTOKEN

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
    },
    logger: {
      level: "debug",
    },
    httpLogger: {
      hideSecrets: [
        ...Object.values(tokens).flatMap((values) => values),
        ...(supertoken ? [supertoken] : []),
      ],
    },
  }

  return config
}
