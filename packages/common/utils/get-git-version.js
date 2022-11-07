const asyncShell = require("./async-shell")

module.exports = async (cwd = process.cwd()) => {
  const tags = await asyncShell("git rev-list --tags --max-count=1", { cwd })
  let tag = await asyncShell(`git describe --tags ${tags}`, { cwd })
  tag = tag.trim()
  if (tag.endsWith("-")) {
    tag = tag.slice(0, -1)
  }
  return tag
}
