// const { ctx } = require("@modjo/core")
// const { reqCtx } = require("@modjo/express/ctx")
const crypto = require("crypto")

module.exports = function () {
  return ({ signature, body, secret, sigHashAlg = "sha256" }) => {
    if (!secret) {
      return false
    }
    const sig = Buffer.from(signature || "", "utf8")
    const hmac = crypto.createHmac(sigHashAlg, secret)
    const hex = `${sigHashAlg}=${hmac.update(body).digest("hex")}`
    const digest = Buffer.from(hex, "utf8")
    return sig.length === digest.length && crypto.timingSafeEqual(digest, sig)
  }
}
