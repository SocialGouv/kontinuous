const parseGitUrl = require("parse-github-url")

module.exports = (repositoryUrl, protocol = "https") => {
  const url = parseGitUrl(repositoryUrl)
  const auth = url.auth ? `${url.auth}@` : ""
  const port = url.port ? `:${url.port}` : ""
  const separator = protocol === "ssh" ? ":" : "/"
  const repoUrl = `${protocol}://${auth}${
    url.hostname || "github.com"
  }${port}${separator}${url.repo}`
  return repoUrl
}
