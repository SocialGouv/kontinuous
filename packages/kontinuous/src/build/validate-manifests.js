const ctx = require("~common/ctx")

const createContext = require("~/plugins/context")
const ValidationError = require("./validation-error")

module.exports = async (manifests, values) => {
  const config = ctx.require("config")
  const context = createContext({ type: "validators", values, ValidationError })
  const { buildProjectPath } = config
  await require(`${buildProjectPath}/validators`)(manifests, {}, context)
}
