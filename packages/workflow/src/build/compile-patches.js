const { buildCtx } = require("~/build/ctx")

module.exports = async (manifests, values) => {
  const env = buildCtx.require("env")
  const { KW_BUILD_PATH, KW_WORKSPACE_KW_PATH } = env
  
  let patched = await require(`${KW_BUILD_PATH}/patches`)(manifests, values)
  
  let requirable
  try {
    require.resolve(`${KW_WORKSPACE_KW_PATH}/patches`)
    requirable = true
  }catch(_e){
    requirable = false
  }

  if (requirable){
    patched = await require(`${KW_WORKSPACE_KW_PATH}/patches`)(manifests, values)
  }

  return patched
}
