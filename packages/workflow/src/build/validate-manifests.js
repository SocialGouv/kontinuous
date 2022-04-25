const { buildCtx } = require("~/build/ctx")

module.exports = async (manifests, values) => {
  const env = buildCtx.require("env")
  const { KWBUILD_PATH, WORKSPACE_KW_PATH } = env

  await require(`${KWBUILD_PATH}/validators`)(manifests, values)

  let requirable
  try {
    require.resolve(`${WORKSPACE_KW_PATH}/validators`)
    requirable = true
  } catch (_e) {
    requirable = false
  }
  if (requirable) {
    await require(`${WORKSPACE_KW_PATH}/validators`)(manifests, values)
  }
}
