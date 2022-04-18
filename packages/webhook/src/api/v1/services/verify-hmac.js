// const { ctx } = require("@modjo-plugins/core")
// const { reqCtx } = require("@modjo-plugins/express/ctx")
const crypto = require("crypto")

module.exports = function () {
  return ({ signature, body, secret }) => {
    const hmac = crypto.createHmac("sha256", secret)
    hmac.update(body, "utf-8")
    return signature === `sha256=${hmac.digest("hex")}`
  }
}
