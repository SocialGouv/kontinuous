const shell = require("./shell")

module.exports = (cwd = process.cwd()) =>
  shell("git remote get-url origin", { cwd }).trim()
