const { execSync } = require("child_process")

const shell = (cmd, options) => execSync(cmd, { encoding: "utf-8", ...options })

module.exports = shell
