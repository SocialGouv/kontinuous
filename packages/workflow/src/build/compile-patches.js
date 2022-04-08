const { buildCtx } = require("~/build/ctx")

module.exports = async (manifests, values) => {
  const env = buildCtx.require("env")
  const { KWBUILD_PATH } = env
  const patches = require(`${KWBUILD_PATH}/patches`)
  return patches(manifests, values)
}
