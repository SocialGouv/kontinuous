const asyncShell = require("./async-shell")

module.exports = async (cwd = process.cwd()) => {
  const tags = await asyncShell("git rev-list --tags --max-count=1", { cwd })
  const tag = await asyncShell(`git describe --tags ${tags}`, { cwd })
  return tag
}
