const parseGitUrl = require("~common/utils/parse-git-url")

module.exports = (gitUrl) => {
  const url = parseGitUrl(gitUrl)
  const { repository } = url
  return repository
}
