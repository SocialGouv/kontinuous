const refEnv = require("~common/utils/ref-env")

const getGitRef = require("~common/utils/get-git-ref")
const { buildCtx } = require("~/build/ctx")

const envs = ["dev", "preprod", "prod"]

module.exports = async ({
  options = {},
  cwd,
  env = buildCtx.get("env") || process.env,
  ref,
}) => {
  if (options.E) {
    return options.E
  }

  if (env.KW_ENVIRONMENT && envs.includes(env.KW_ENVIRONMENT)) {
    return env.KW_ENVIRONMENT
  }

  if (ref) {
    return refEnv(ref)
  }
  if (env.KW_GIT_REF) {
    return refEnv(env.KW_GIT_REF)
  }

  const GIT_REF = await getGitRef(cwd)
  return refEnv(GIT_REF)
}
