const ctx = require("~/ctx")

module.exports = async (manifests, values) => {
  const env = ctx.require("env")
  const { KS_BUILD_PATH, KS_WORKSPACE_KS_PATH } = env
  
  let patched = await require(`${KS_BUILD_PATH}/patches`)(manifests, values)
  
  let requirable
  try {
    require.resolve(`${KS_WORKSPACE_KS_PATH}/patches`)
    requirable = true
  }catch(_e){
    requirable = false
  }

  if (requirable){
    patched = await require(`${KS_WORKSPACE_KS_PATH}/patches`)(manifests, values)
  }

  return patched
}
