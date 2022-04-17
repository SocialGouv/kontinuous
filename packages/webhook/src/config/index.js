const writeKubeconfig = require("~common/utils/write-kubeconfig")

module.exports = async function createConfig() {
  const rancherProjectName = process.env.RANCHER_PROJECT_NAME
  const jobNamespace = `${rancherProjectName}-ci`

  await writeKubeconfig(["KUBECONFIG", "KUBECONFIG_DEV", "KUBECONFIG_PROD"])

  const config = {
    project: {
      rancherProjectName,
      jobNamespace,
    },
  }

  return config
}
