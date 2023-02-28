const parseGitUrl = require("~common/utils/parse-git-url")

module.exports = (repositoryUrl, protocol = "https") => {
  const url = parseGitUrl(repositoryUrl)
  const auth = url.auth ? `${url.auth}@` : protocol === "ssh" ? "git@" : ""
  const port = url.port ? `:${url.port}` : ""
  const separator = protocol === "git" ? ":" : "/"
  const repoUrl = `${protocol}://${auth}${
    url.host || "github.com"
  }${port}${separator}${url.repo}`
  return repoUrl
}
