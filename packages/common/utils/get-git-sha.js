const asyncShell = require("./async-shell")

module.exports = async (cwd = process.cwd(), branch = "HEAD") => {
  const res = await asyncShell(`git rev-parse ${branch}`, { cwd })
  return res.trim()
}
