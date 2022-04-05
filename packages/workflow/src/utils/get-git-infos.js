const GitUrlParse = require("git-url-parse")
const shell = require("~/utils/shell")
const logger = require("~/utils/logger")

let gitInfos

module.exports = (cwd = process.cwd(), reloadCache = false) => {
  if (!gitInfos || reloadCache) {
    let GIT_REF
    let GIT_SHA
    let GIT_REPOSITORY
    try {
      GIT_REF = shell("git branch --show-current", { cwd }).trim()
      GIT_SHA = shell("git show -s --format=%H", { cwd }).trim()

      const gitUrl = shell("git remote get-url origin", { cwd }).trim()
      const url = GitUrlParse(gitUrl)
      let { pathname } = url
      if (pathname.startsWith("/")) {
        pathname = pathname.slice(1)
      }
      if (pathname.endsWith(".git")) {
        pathname = pathname.slice(0, -4)
      }
      GIT_REPOSITORY = pathname
    } catch (e) {
      logger.error(
        "Unable to retrieve git info, ensure that you have git installed and the current directroy is a git repository"
      )
      throw e
    }
    let GIT_TAGS
    try {
      GIT_TAGS = shell("git tag --points-at HEAD", { cwd })
        .split("\n")
        .map((tag) => tag.trim())
    } catch (_e) {
      // not on a tag
      GIT_TAGS = []
    }
    gitInfos = {
      GIT_REPOSITORY,
      GIT_REF,
      GIT_SHA,
      GIT_TAGS,
    }
  }
  return gitInfos
}
