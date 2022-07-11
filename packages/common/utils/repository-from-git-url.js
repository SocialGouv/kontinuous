const parseGitUrl = require("parse-github-url")

module.exports = (gitUrl) => {
  const url = parseGitUrl(gitUrl)
  const { repository } = url
  return repository
}
