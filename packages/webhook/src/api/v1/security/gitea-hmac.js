const { ctx } = require("@modjo-plugins/core")

module.exports =
  ({ services: { verifyHmac } }) =>
  async (req, _scopes, _schema) => {
    const signature = req.get("X-Gitea-Signature")
    if (!signature) {
      return false
    }
    const webhookToken = ctx.require("config.project.webhook.token")
    return verifyHmac({
      signature,
      body: req.rawBody,
      secret: webhookToken,
    })
  }
