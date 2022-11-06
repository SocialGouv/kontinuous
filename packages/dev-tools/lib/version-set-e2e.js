const getGitAbbrevRef = require("~common/utils/get-git-abbrev-ref")
const getGitMajorVersion = require("~common/utils/get-git-major-version")
const sanitizeTag = require("~common/utils/sanitize-tag")

const getVersionFromBranch = async () => {
  let ref = await getGitAbbrevRef()
  if (ref === "master") {
    ref = await getGitMajorVersion()
  }
  return sanitizeTag(ref)
}
module.exports = async (version) => {
  if (!version) {
    version = await getVersionFromBranch()
  }
}
