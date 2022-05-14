const ctx = require("~/ctx")

module.exports = async (manifests, values) => {
  const env = ctx.require("env")
  const { KS_BUILD_PATH, KS_WORKSPACE_KS_PATH } = env

  await require(`${KS_BUILD_PATH}/validators`)(manifests, values)

  let requirable
  try {
    require.resolve(`${KS_WORKSPACE_KS_PATH}/validators`)
    requirable = true
  } catch (_e) {
    requirable = false
  }
  if (requirable) {
    await require(`${KS_WORKSPACE_KS_PATH}/validators`)(manifests, values)
  }
}
