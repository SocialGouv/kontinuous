const { buildCtx } = require("~/build/ctx")

module.exports = async (manifests, values) => {
  const env = buildCtx.require("env")
  const { KWBUILD_PATH } = env
  const validate = require(`${KWBUILD_PATH}/validators`)
  await validate(manifests, values)
}
