const shell = require("./shell")

module.exports = (cwd = process.cwd()) =>
  shell("git branch --show-current", { cwd }).trim()
