const writeKubeconfig = require("~common/utils/write-kubeconfig")

const oasUri = require("./oas-uri")

module.exports = async function createConfig() {
  const rancherProjectName = process.env.RANCHER_PROJECT_NAME
  const jobNamespace = `${rancherProjectName}-ci`

  await writeKubeconfig(["KUBECONFIG", "KUBECONFIG_DEV", "KUBECONFIG_PROD"])

  const config = {
    project: {
      rancherProjectName,
      jobNamespace,
      oas: {
        uri: oasUri(),
      },
      webhook: {
        token: process.env.KUBEWEBHOOK_TOKEN,
      },
    },
  }

  return config
}
