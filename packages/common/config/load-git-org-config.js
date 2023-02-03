const defaultsDeep = require("lodash.defaultsdeep")

const getGitUrl = require("~common/utils/get-git-url")
const normalizeRepositoryUrl = require("~common/utils/normalize-repository-url")

const getGitRemoteDefaultBranch = require("~common/utils/get-git-remote-default-branch")
const parseGitUrl = require("~common/utils/parse-git-url")
const downloadGitOrgConfig = require("./download-git-org-config")

module.exports = async (config, reloadConfig) => {
  const {
    gitOrg,
    gitOrgOverride,
    gitOrgRepository,
    gitOrgPath,
    gitOrgRequired,
    gitOrgRef,
  } = config
  if (!gitOrg) {
    return config
  }

  const gitUrl = await getGitUrl()

  let orga
  if (gitOrgOverride) {
    orga = gitOrgOverride
  } else {
    const url = parseGitUrl(gitUrl)
    orga = url.owner
  }

  const gitRepository = `${orga}/${gitOrgRepository}`

  const gitRepositoryUrl = normalizeRepositoryUrl(gitRepository, "ssh")

  let exists
  let defaultRef
  try {
    defaultRef = await getGitRemoteDefaultBranch(gitRepositoryUrl)
    exists = true
  } catch (error) {
    if (gitOrgRequired) {
      throw error
    }
    exists = false
  }

  if (!exists) {
    return config
  }

  const ref = gitOrgRef || defaultRef

  const orgaConfig = await downloadGitOrgConfig(
    gitRepositoryUrl,
    gitOrgPath,
    ref
  )

  defaultsDeep(config, orgaConfig)

  config = await reloadConfig()

  return config
}
