const getGitInfos = require("./get-git-infos")

const versionTagRe = /v[0-9]*/

module.exports = (options) => {
  if (options.E) {
    return options.E
  }
  const { GIT_REF, GIT_TAGS } = getGitInfos()
  if (GIT_REF === "master" || GIT_REF === "main") {
    return "preprod"
  }
  if (GIT_TAGS.some((tag) => versionTagRe.test(tag))) {
    return "prod"
  }
  return "dev"
}
