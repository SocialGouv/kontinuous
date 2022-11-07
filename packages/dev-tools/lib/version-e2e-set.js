const replace = require("replace")

const getGitAbbrevRef = require("~common/utils/get-git-abbrev-ref")
const getGitMajorVersion = require("~common/utils/get-git-major-version")
const sanitizeTag = require("~common/utils/sanitize-tag")

const versionE2eConfig = require("./version-e2e-config")

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

  for (const target of versionE2eConfig.targets) {
    replace({
      ...versionE2eConfig.common,
      regex: target.regex,
      replacement: target.replacementFactory(version),
    })
  }

  console.log(`✨ all source files were linked to version "${version}"`)
}
