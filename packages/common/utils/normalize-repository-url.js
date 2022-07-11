const GitUrlParse = require("git-url-parse")

module.exports = async (repositoryUrl, format = "https") => {
  const url = GitUrlParse(repositoryUrl)
  if (!url.resource) {
    url.resource = "github.com"
  }
  let repoUrl = GitUrlParse.stringify(url, format)
  if (repoUrl.endsWith(".git")) {
    repoUrl = repoUrl.slice(0, -4)
  }
  return repoUrl
}
