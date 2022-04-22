const repositoryFromGitUrl = require("./repository-from-git-url")
const getGitUrl = require("./get-git-url")

module.exports = (cwd = process.cwd(), url = getGitUrl(cwd)) =>
  repositoryFromGitUrl(url)
