const { buildCtx } = require("~/build/ctx")

module.exports = async (manifests, values) => {
  const env = buildCtx.require("env")
  const { KWBUILD_PATH, WORKSPACE_PATH, WORKSPACE_SUBPATH } = env
  
  let patched = await require(`${KWBUILD_PATH}/patches`)(manifests, values)
  
  const workspaceKubeworkflowPath = `${WORKSPACE_PATH}${WORKSPACE_SUBPATH}`
  let requirable
  try {
    require.resolve(`${workspaceKubeworkflowPath}/patches`)
    requirable = true
  }catch(_e){
    requirable = false
  }
  console.log({requirable})
  if (requirable){
    patched = await require(`${workspaceKubeworkflowPath}/patches`)(manifests, values)
  }

  return patched
}
