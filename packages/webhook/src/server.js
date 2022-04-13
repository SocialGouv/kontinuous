const modjo = require("@modjo-plugins/core")
const defaultsDeep = require("lodash.defaultsdeep")

const customConfig = require(`~/config`)

module.exports = (options = {}) => {
  options = defaultsDeep(options, {
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
  modjo(options)
}
