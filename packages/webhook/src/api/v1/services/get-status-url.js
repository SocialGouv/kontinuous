const { ctx } = require("@modjo-plugins/core")

const qs = require("qs")

const commitToken = require("~common/utils/commit-token")

module.exports = function () {
  return ({ repositoryUrl, gitBranch, gitCommit }) => {
    const webhookToken = ctx.require("config.project.webhook.token")
    const token = commitToken(gitCommit, webhookToken)
    const query = qs.stringify({
      repository: repositoryUrl,
      branch: gitBranch,
      commit: gitCommit,
      token,
    })
    const uri = ctx.require("config.project.oas.uri")
    return `${uri}/api/v1/oas/artifacts/status?${query}`
  }
}
