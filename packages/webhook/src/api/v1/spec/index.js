async function createApiSpecV1(options = {}) {
  const port = process.env.KUBEWEBHOOK_EXPOSED_PORT || options.port
  const host = process.env.KUBEWEBHOOK_EXPOSED_HOST || options.host
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
        url: `http://${host}:${port}${options.path}`,
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
