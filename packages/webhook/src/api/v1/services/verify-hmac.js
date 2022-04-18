// const { ctx } = require("@modjo-plugins/core")
// const { reqCtx } = require("@modjo-plugins/express/ctx")
const crypto = require("crypto")

module.exports = function () {
  return ({ signature, body, secret, sigHashAlg = "sha256" }) => {
    const sig = Buffer.from(signature || "", "utf8")
    const hmac = crypto.createHmac(sigHashAlg, secret)
    const digest = Buffer.from(
      `${sigHashAlg}=${hmac.update(body).digest("hex")}`,
      "utf8"
    )
    console.log(`${sigHashAlg}=${hmac.update(body).digest("hex")}`)
    console.log("signature", signature)
    return sig.length === digest.length && crypto.timingSafeEqual(digest, sig)
  }
}
