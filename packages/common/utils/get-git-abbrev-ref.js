const asyncShell = require("./async-shell")

module.exports = async (cwd = process.cwd()) => {
  const ref = (
    await asyncShell("git rev-parse --abbrev-ref HEAD", { cwd })
  ).trim()
  return ref
}
