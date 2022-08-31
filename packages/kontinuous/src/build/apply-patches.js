const ctx = require("~common/ctx")

const createContext = require("~/plugins/context")
const pluginFunction = require("~/plugins/context/function")

module.exports = async (manifests, values) => {
  const context = createContext({ type: "patches", values })
  const config = ctx.require("config")
  const { buildProjectPath } = config
  manifests = await pluginFunction(`${buildProjectPath}/patches`)(
    manifests,
    {},
    context
  )
  return manifests
}
