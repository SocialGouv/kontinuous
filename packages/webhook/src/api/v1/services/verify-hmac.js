// const { ctx } = require("@modjo-plugins/core")
// const { reqCtx } = require("@modjo-plugins/express/ctx")
const crypto = require("crypto")

module.exports = function () {
  return ({ signature, body, secret }) => {
    const hmac = crypto.createHmac("sha1", secret)
    hmac.update(body, "utf-8")
    return signature === `sha1=${hmac.digest("hex")}`
  }
}
