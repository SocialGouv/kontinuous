const { buildCtx } = require("~/build/ctx")

module.exports = async (manifests, values) => {
  const env = buildCtx.require("env")
  const { KWBUILD_PATH, WORKSPACE_PATH, WORKSPACE_SUBPATH } = env

  await require(`${KWBUILD_PATH}/validators`)(manifests, values)

  const workspaceKubeworkflowPath = `${WORKSPACE_PATH}${WORKSPACE_SUBPATH}`
  let requirable
  try {
    require.resolve(`${workspaceKubeworkflowPath}/validators`)
    requirable = true
  } catch (_e) {
    requirable = false
  }
  if (requirable) {
    await require(`${workspaceKubeworkflowPath}/validators`)(manifests, values)
  }
}
