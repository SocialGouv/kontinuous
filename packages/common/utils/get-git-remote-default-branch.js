const asyncShell = require("./async-shell")
const normalizeRepositoryUrl = require("./normalize-repository-url")

const defaultBranchRefRegex = /ref: refs\/heads\/(.*)\s+HEAD/

module.exports = async (gitUrl) => {
  const result = await asyncShell(
    `git ls-remote --symref ${normalizeRepositoryUrl(gitUrl)} HEAD`
  )
  const matches = result.match(defaultBranchRefRegex)
  return matches[1]
}
