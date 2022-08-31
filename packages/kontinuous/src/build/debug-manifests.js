const ctx = require("~common/ctx")

const createContext = require("~/plugins/context")
const pluginFunction = require("~/plugins/context/function")

module.exports = async (manifests, values) => {
  const config = ctx.require("config")
  const context = createContext({ type: "debug-manifests", values })
  const { buildProjectPath } = config
  await pluginFunction(`${buildProjectPath}/debug-manifests`)(
    manifests,
    {},
    context
  )
}
