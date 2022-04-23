const asyncShell = require("./async-shell")

module.exports = async (cwd = process.cwd()) =>
  (await asyncShell("git branch --show-current", { cwd })).trim()
