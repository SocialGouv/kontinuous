const repositoryFromGitUrl = require("./repository-from-git-url")
const getGitUrl = require("./get-git-url")

module.exports = async (cwd = process.cwd(), url = null) => {
  if (!url) {
    url = await getGitUrl(cwd)
  }
  return repositoryFromGitUrl(url)
}
