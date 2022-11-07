const replace = require("replace")

const getGitAbbrevRef = require("~common/utils/get-git-abbrev-ref")
const getGitMajorVersion = require("~common/utils/get-git-major-version")
const getGitVersion = require("~common/utils/get-git-version")
const sanitizeTag = require("~common/utils/sanitize-tag")

const versionE2eConfig = require("./version-e2e-config")

const getVersionFromBranch = async ({ major }) => {
  let ref = await getGitAbbrevRef()
  if (ref === "master") {
    if (major) {
      ref = await getGitMajorVersion()
    } else {
      ref = await getGitVersion()
    }
  }
  return ref
}
module.exports = async (version, options = {}) => {
  const { major = false } = options
  if (!version) {
    version = await getVersionFromBranch({ major })
  }
  version = sanitizeTag(version)

  for (const replacer of versionE2eConfig.replacers) {
    replace({
      ...versionE2eConfig.common,
      regex: replacer.regex,
      replacement: replacer.replacementFactory(version),
    })
  }

  console.log(`✨ all source files were linked to version "${version}"`)
}
