const modjo = require("@modjo-plugins/core")

const customConfig = require(`~/config`)

modjo({
  plugins: {
    config: {
      pluginName: "config",
      context: (ctx) => {
        ctx.set("customConfig", customConfig)
      },
    },
  },
  dependencies: {
    oapi: {
      pluginName: "microservice-oapi",
    },
  },
})
