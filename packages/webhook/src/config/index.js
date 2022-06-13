const writeKubeconfig = require("~common/utils/write-kubeconfig")

const oasUri = require("./oas-uri")

module.exports = async function createConfig() {
  const jobNamespace = process.env.KS_CI_NAMESPACE

  await writeKubeconfig(["KUBECONFIG", "KUBECONFIG_DEV", "KUBECONFIG_PROD"])

  const token = process.env.KUBEWEBHOOK_TOKEN

  const config = {
    project: {
      jobNamespace,
      oas: {
        uri: oasUri(),
      },
      webhook: {
        token,
      },
    },
    httpLogger: {
      hideSecrets: [token],
    },
  }

  return config
}
