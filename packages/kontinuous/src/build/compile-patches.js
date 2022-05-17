const ctx = require("~/ctx")

module.exports = async (manifests, values) => {
  const config = ctx.require("config")
  const { buildPath, workspaceSubPath } = config
  
  let patched = await require(`${buildPath}/dependencies/project/patches`)(manifests, values)
  
  let requirable
  try {
    require.resolve(`${workspaceSubPath}/patches`)
    requirable = true
  }catch(_e){
    requirable = false
  }

  if (requirable){
    patched = await require(`${workspaceSubPath}/patches`)(manifests, values)
  }

  return patched
}
