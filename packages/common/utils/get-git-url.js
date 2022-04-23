const asyncShell = require("./async-shell")

module.exports = async (cwd = process.cwd()) =>
  (await asyncShell("git remote get-url origin", { cwd })).trim()
