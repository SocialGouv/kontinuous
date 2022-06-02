const { ctx } = require("@modjo-plugins/core")

async function createApiSpecV1(options = {}) {
  const uri = ctx.require("config.project.oas.uri")

  const apiSpec = {
    openapi: "3.0.3",
    info: {
      title: "Kontinuous Webhook API 🚀",
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
