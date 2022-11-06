const replace = require("replace")

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

  replace({
    regex: "SocialGouv/kontinuous(.*)(:|@)([a-zA-Z0-9-]+)",
    replacement: `SocialGouv/kontinuous$1$2${version}`,
    paths: [process.cwd()],
    recursive: true,
    silent: false,
    exclude: "__snpahost__, *.md",
  })
}
