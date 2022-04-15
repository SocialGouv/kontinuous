async function createApiSpecV1(options = {}) {
  const port = process.env.KUBEWEBHOOK_EXPOSED_PORT || options.port
  const host = process.env.KUBEWEBHOOK_EXPOSED_HOST || options.host
  const https =
    process.env.KUBEWEBHOOK_EXPOSED_HTTPS &&
    process.env.KUBEWEBHOOK_EXPOSED_HTTPS !== "false"

  let uri = "http"
  if (https) {
    uri += "s"
  }
  uri += `://${host}`
  const defaultPort = https ? "443" : "80"
  if (port && port.toString() !== defaultPort) {
    uri += `:${port}`
  }

  const apiSpec = {
    openapi: "3.0.3",
    info: {
      title: "Kube-Workflow Webhook API",
      version: require(`${process.cwd()}/package.json`).version,
      description: "Run workflow in kube from webhook call",
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `${uri}${options.path}`,
      },
    ],
    components: {
      schemas: {},
    },
    paths: {},
  }
  return apiSpec
}

module.exports = createApiSpecV1
