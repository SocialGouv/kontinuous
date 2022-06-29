const ctx = require("~/ctx")

const createContext = require("./context")

module.exports = async (manifests, values) => {
  const config = ctx.require("config")
  const context = createContext({ type: "debug-manifests", values })
  const { buildProjectPath } = config
  await require(`${buildProjectPath}/debug-manifests`)(manifests, {}, context)
}
