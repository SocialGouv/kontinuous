const getGitVersion = require("./get-git-version")

module.exports = async (cwd = process.cwd()) => {
  const tag = await getGitVersion(cwd)
  return tag.split(".").shift()
}
