const parseGitUrl = require("~common/utils/parse-git-url")

module.exports = (repositoryUrl) => {
  const url = parseGitUrl(repositoryUrl)
  const repo = `${url.hostname || "github.com"}/${url.repo}`
  return repo
}
