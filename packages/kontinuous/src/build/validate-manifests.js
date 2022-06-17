const ctx = require("~/ctx")

const createContext = require("./context")

module.exports = async (manifests, values)=>{
  const config = ctx.require("config")
  const context = createContext({type: "validators", values})
  const {buildProjectPath} = config
  await require(`${buildProjectPath}/validators`)(manifests, {}, context)
}
