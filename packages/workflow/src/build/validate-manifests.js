const { buildCtx } = require("~/build/ctx")

module.exports = async (manifests, values) => {
  const env = buildCtx.require("env")
  const { KW_BUILD_PATH, KW_WORKSPACE_KW_PATH } = env

  await require(`${KW_BUILD_PATH}/validators`)(manifests, values)

  let requirable
  try {
    require.resolve(`${KW_WORKSPACE_KW_PATH}/validators`)
    requirable = true
  } catch (_e) {
    requirable = false
  }
  if (requirable) {
    await require(`${KW_WORKSPACE_KW_PATH}/validators`)(manifests, values)
  }
}
