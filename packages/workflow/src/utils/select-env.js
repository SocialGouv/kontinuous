const isVersionTag = require("~common/utils/is-version-tag")
const getGitInfos = require("~/utils/get-git-infos")

const { buildCtx } = require("~/build/ctx")

const envs = ["dev", "preprod", "prod"]

module.exports = ({
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
    ref = ref.replace("refs/heads/", "").replace("refs/tags/", "")
    if (ref === "master" || ref === "main") {
      return "preprod"
    }
    if (isVersionTag(ref)) {
      return "prod"
    }
    return "dev"
  }

  const { GIT_REF, GIT_TAGS } = getGitInfos(cwd, env)
  if (detectCurrentTags && GIT_TAGS.some((tag) => isVersionTag(tag))) {
    return "prod"
  }
  if (isVersionTag(GIT_REF)) {
    return "prod"
  }
  if (GIT_REF === "master" || GIT_REF === "main") {
    return "preprod"
  }
  return "dev"
}
