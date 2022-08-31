const fs = require("fs-extra")

const ctx = require("~common/ctx")

const createContext = require("~/plugins/context")
const pluginFunction = require("~/plugins/context/function")

module.exports = async (manifests, step) => {
  const config = ctx.require("config")
  const type = `${step}-deploy`
  const context = createContext({ type })
  const { buildProjectPath } = config
  const requirePath = `${buildProjectPath}/${type}`
  if (await fs.pathExists(requirePath)) {
    await pluginFunction(requirePath)(manifests, {}, context)
  }
}
