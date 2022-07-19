const ctx = require("~common/ctx")

const createContext = require("~/plugins/context")

module.exports = async (manifests, values) => {
  const context = createContext({ type: "patches", values })
  const config = ctx.require("config")
  const { buildProjectPath } = config
  manifests = await require(`${buildProjectPath}/patches`)(
    manifests,
    {},
    context
  )
  return manifests
}
