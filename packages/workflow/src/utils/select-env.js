const isVersionTag = require("~common/utils/is-version-tag")
const refEnv = require("~common/utils/ref-env")
const getGitInfos = require("~/utils/get-git-infos")

const { buildCtx } = require("~/build/ctx")

const envs = ["dev", "preprod", "prod"]

module.exports = async ({
  options = {},
  cwd,
  env = buildCtx.get("env") || process.env,
  ref,
  detectCurrentTags = true,
}) => {
  if (options.E) {
    return options.E
  }

  if (env.ENVIRONMENT && envs.includes(env.ENVIRONMENT)) {
    return env.ENVIRONMENT
  }

  if (ref) {
    return refEnv(ref)
  }

  const { GIT_REF, GIT_TAGS } = await getGitInfos(cwd, env)
  if (detectCurrentTags && GIT_TAGS.some((tag) => isVersionTag(tag))) {
    return "prod"
  }
  return refEnv(GIT_REF)
}
