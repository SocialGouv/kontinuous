const asyncShell = require("./async-shell")

module.exports = async (cwd = process.cwd()) => {
  let ref = (await asyncShell("git branch --show-current", { cwd })).trim()
  if (!ref) {
    ref = (await asyncShell("git name-rev --name-only HEAD", { cwd })).trim()
  }
  return ref
}
