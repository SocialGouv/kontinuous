const modjo = require("@modjo/core")
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
      configReloader: {
        dependencies: ["config", "logger", "shutdownHandlers"],
      },
      home: {
        dependencies: ["express"],
      },
      express: {
        dependencies: ["sentry"],
      },
      oa: {
        context: (ctx) => {
          commonCtx.set("logger", ctx.require("logger"))
        },
      },
    },
    dependencies: {
      oapi: {
        pluginName: "microservice-oapi",
      },
      home: {
        pluginName: "home",
      },
      configReloader: {
        pluginName: "configReloader",
      },
    },
  })
  commonCtx.provide()
  await modjo(options)
}
