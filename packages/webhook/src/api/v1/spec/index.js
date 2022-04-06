async function createApiSpecV1(options = {}) {
  console.log(options)

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
        url: `http://${options.host}:${options.port}${options.path}`,
      },
    ],
    components: {
      schemas: {},
    },
    paths: {},
    "x-security-sets": {
      auth: ["githubWebhookToken", "gitlabWebhookToken"],
    },
  }
  return apiSpec
}

module.exports = createApiSpecV1
