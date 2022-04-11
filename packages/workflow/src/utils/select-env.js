const getGitInfos = require("./get-git-infos")

const versionTagRe = /v[0-9][0-9]*/

module.exports = ({ options = {}, cwd, ref, detectCurrentTags = true }) => {
  if (options.E) {
    return options.E
  }

  if (ref) {
    ref = ref.replace("refs/heads/", "").replace("refs/tags/", "")
    if (ref === "master" || ref === "main") {
      return "preprod"
    }
    if (versionTagRe.test(ref)) {
      return "prod"
    }
    return "dev"
  }

  const { GIT_REF, GIT_TAGS } = getGitInfos(cwd)
  if (detectCurrentTags && GIT_TAGS.some((tag) => versionTagRe.test(tag))) {
    return "prod"
  }
  if (versionTagRe.test(GIT_REF)) {
    return "prod"
  }
  if (GIT_REF === "master" || GIT_REF === "main") {
    return "preprod"
  }
  return "dev"
}
