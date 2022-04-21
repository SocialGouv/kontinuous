const crypto = require("crypto")

module.exports = (commit, token) =>
  crypto.createHash("sha256").update(`${commit}.${token}`, "utf8").digest("hex")
