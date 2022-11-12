const path = require("path")

const camelCase = require("lodash.camelcase")

const KontinuousPluginError = require("~common/utils/kontinuous-plugin-error.class")
const configDependencyKey = require("~common/utils/config-dependency-key")
const patternMatch = require("~common/utils/pattern-match")

const pluginFunction = require("./function")

function requireTs(filePath) {
  require("~/ts-node")
  const result = require(filePath)
  return result.default || result
}
function requireJs(filePath) {
  return require(filePath)
}

module.exports = (type, context) => {
  const { config, getOptions, getScope } = context
  const { disablePlugin } = config

  return (inc, parentScope = ["project"]) => {
    const scope = getScope({ scope: parentScope, inc, type })
    const pluginOptions = getOptions({
      scope,
      inc,
      type,
      config,
    })

    const rPath = inc.startsWith("/")
      ? inc
      : path.join(
          config.buildPath,
          ...parentScope.map((s) => `charts/${s}`),
          type,
          inc
        )

    const ext = path.extname(inc)

    const pluginName = [
      scope.slice(1),
      type,
      configDependencyKey(path.basename(inc).slice(0, -1 * ext.length)),
    ]
      .flatMap((v) => v)
      .join("/")
    context.logger = context.logger.child({ plugin: pluginName })

    const pluginFullName = pluginName.split("/").map(camelCase).join("/")
    if (patternMatch(pluginFullName, disablePlugin)) {
      return (data) => data
    }

    return async (data) => {
      let requireFunc
      if (ext === ".ts") {
        requireFunc = requireTs
      } else {
        requireFunc = requireJs
      }

      let plugin = requireFunc(rPath)

      if (Array.isArray(plugin)) {
        plugin = pluginFunction(plugin)
      }

      try {
        const result = await plugin(data, pluginOptions, context, scope)
        if (result) {
          data = result
        }
      } catch (error) {
        context.logger.error(
          {
            error: error.toString(),
            ...(error.data || {}),
            ...(error instanceof KontinuousPluginError
              ? {}
              : { errorStack: error.stack }),
          },
          `plugin error`
        )
        throw error
      }

      return data
    }
  }
}
