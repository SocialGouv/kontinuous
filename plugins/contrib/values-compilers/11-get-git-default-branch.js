module.exports = async (values, _options, { config, utils }) => {
  const { getGitRemoteDefaultBranch } = utils
  const gitDefaultBranch = await getGitRemoteDefaultBranch(
    config.gitRepositoryUrl
  )
  values.global.gitDefaultBranch = gitDefaultBranch
}
