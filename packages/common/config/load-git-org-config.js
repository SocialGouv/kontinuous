const defaultsDeep = require("lodash.defaultsdeep")

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
    gitRepositoryUrl,
  } = config
  if (!gitOrg) {
    return config
  }

  if (!gitRepositoryUrl) {
    if (gitOrgRequired) {
      throw new Error(
        "unable to determine gitRepositoryUrl and gitOrgRequired is set to true"
      )
    }
    return config
  }

  let gitRepository
  if (gitOrgOverride) {
    gitRepository = normalizeRepositoryUrl(
      `${gitOrgOverride}/${gitOrgRepository}`
    )
  } else {
    const url = parseGitUrl(gitRepositoryUrl)
    const protocol = url.protocol || "https"
    const orga = url.owner
    const { host } = url
    gitRepository = `${protocol}://${host}/${orga}/${gitOrgRepository}`
  }

  const gitOrgRepositoryUrl = normalizeRepositoryUrl(gitRepository, "https")

  let exists
  let defaultRef
  try {
    defaultRef = await getGitRemoteDefaultBranch(gitOrgRepositoryUrl)
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
    gitOrgRepositoryUrl,
    gitOrgPath,
    ref
  )

  defaultsDeep(config, orgaConfig)

  config = await reloadConfig()

  return config
}
