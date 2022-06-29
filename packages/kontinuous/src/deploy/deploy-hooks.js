const ctx = require("~/ctx")

const createContext = require("~/plugins/context")

module.exports = async (manifests, step) => {
  const config = ctx.require("config")
  const type = `${step}-deploy`
  const context = createContext({ type })
  const { buildProjectPath } = config
  await require(`${buildProjectPath}/${type}`)(manifests, {}, context)
}
