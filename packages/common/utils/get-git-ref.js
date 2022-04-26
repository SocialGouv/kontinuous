const asyncShell = require("./async-shell")

module.exports = async (cwd = process.cwd()) =>
  (await asyncShell("git name-rev --name-only HEAD", { cwd })).trim()
