const isVersionTag = require("./is-version-tag")
const getGitInfos = require("./get-git-infos")

const envs = ["dev", "preprod", "prod"]

module.exports = ({ options = {}, cwd, ref, detectCurrentTags = true }) => {
  if (options.E) {
    return options.E
  }

  if (process.env.ENVIRONMENT && envs.includes(process.env.ENVIRONMENT)) {
    return process.env.ENVIRONMENT
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

  const { GIT_REF, GIT_TAGS } = getGitInfos(cwd)
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
