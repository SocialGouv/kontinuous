const { ctx } = require("@modjo-plugins/core")

const commitToken = require("~common/utils/commit-token")

module.exports = () => async (req, _scopes, _schema) => {
  const { token } = req.query
  if (!token) {
    return false
  }
  const commit = req.query.commit || req.body.commit
  if (!commit) {
    return false
  }
  const webhookToken = ctx.require("config.project.webhook.token")
  return token === commitToken(commit, webhookToken)
}
