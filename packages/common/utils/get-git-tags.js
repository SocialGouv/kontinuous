const asyncShell = require("./async-shell")

module.exports = async (cwd = process.cwd()) => {
  let GIT_TAGS
  try {
    GIT_TAGS = (await asyncShell("git tag --points-at HEAD", { cwd }))
      .split("\n")
      .map((tag) => tag.trim())
  } catch (_e) {
    // not on a tag
    GIT_TAGS = []
  }
  return GIT_TAGS
}
