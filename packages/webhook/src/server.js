const modjo = require("@modjo-plugins/core")
const defaultsDeep = require("lodash.defaultsdeep")

const customConfig = require(`~/config`)

const commonCtx = require("~common/ctx")

module.exports = async (options = {}) => {
  options = defaultsDeep(options, {
    plugins: {
      config: {
        pluginName: "config",
        context: (ctx) => {
          ctx.set("customConfig", customConfig)
        },
      },
      home: {
        dependencies: ["express"],
      },
    },
    dependencies: {
      oapi: {
        pluginName: "microservice-oapi",
      },
      home: {
        pluginName: "home",
      },
    },
  })
  commonCtx.provide()
  await modjo(options)
}
