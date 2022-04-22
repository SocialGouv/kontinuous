const shell = require("./shell")

module.exports = (cwd = process.cwd()) =>
  shell("git show -s --format=%H", { cwd }).trim()
