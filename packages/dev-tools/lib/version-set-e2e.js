const replace = require("replace")

const getGitAbbrevRef = require("~common/utils/get-git-abbrev-ref")
const getGitMajorVersion = require("~common/utils/get-git-major-version")
const sanitizeTag = require("~common/utils/sanitize-tag")

const getVersionFromBranch = async () => {
  let ref = await getGitAbbrevRef()
  if (ref === "master") {
    ref = await getGitMajorVersion()
  }
  return ref
}
module.exports = async (version) => {
  if (!version) {
    version = await getVersionFromBranch()
  }
  version = sanitizeTag(version)

  const replaceConfig = {
    paths: ["./"],
    recursive: true,
    silent: false,
    exclude: "*.md,node_modules",
  }
  replace({
    ...replaceConfig,
    regex: "SocialGouv/kontinuous(.*)(:|@)([a-zA-Z0-9-]+)",
    replacement: `SocialGouv/kontinuous$1$2${version}`,
  })
  replace({
    ...replaceConfig,
    regex: "socialgouv/kontinuous(.*)(:|@)([a-zA-Z0-9-]+)",
    replacement: `socialgouv/kontinuous$1$2${version}`,
  })

  console.log(`✨ all source files were linked to version "${version}"`)
}
