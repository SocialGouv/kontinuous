const fs = require("fs-extra")

const oasUri = require("./oas-uri")

module.exports = async function createConfig() {
  const jobNamespace = process.env.KS_CI_NAMESPACE

  const secretsRootPath = "/secrets"
  const tokens = {}
  const kubeconfigFiles = {}
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
        const secretTokenFile = `${secretTokenDir}/${tokenFile}`
        if (!(await fs.stat(secretTokenFile)).isFile()) {
          continue
        }
        const token = await fs.readFile(secretTokenFile, {
          encoding: "utf-8",
        })
        tokens[secretProjectDir].push(token)
      }
      const secretKubeconfigFile = `${secretProjectDirPath}/kubeconfig`
      kubeconfigFiles[secretProjectDir] = secretKubeconfigFile
    }
  }

  const supertoken = process.env.KUBEWEBHOOK_SUPERTOKEN

  const config = {
    project: {
      jobNamespace,
      oas: {
        uri: oasUri(),
      },
      secrets: {
        tokens,
        supertoken,
        kubeconfigFiles,
      },
    },
    logger: {
      level: "debug",
    },
    httpLogger: {
      hideSecrets: [
        ...Object.values(tokens).flatMap((values) => values),
        supertoken,
      ],
    },
  }

  return config
}
