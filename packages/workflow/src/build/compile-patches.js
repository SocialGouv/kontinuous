const { buildCtx } = require("~/build/ctx")

module.exports = async (manifests, values) => {
  const env = buildCtx.require("env")
  const { KWBUILD_PATH, WORKSPACE_KW_PATH } = env
  
  let patched = await require(`${KWBUILD_PATH}/patches`)(manifests, values)
  
  let requirable
  try {
    require.resolve(`${WORKSPACE_KW_PATH}/patches`)
    requirable = true
  }catch(_e){
    requirable = false
  }

  if (requirable){
    patched = await require(`${WORKSPACE_KW_PATH}/patches`)(manifests, values)
  }

  return patched
}
