const { ctx } = require("@modjo-plugins/core")

module.exports = () => async (req, _scopes, _schema) => {
  const token = req.get("X-Gitlab-Token")
  const webhookToken = ctx.require("config.project.webhook.token")
  return token === webhookToken
}
