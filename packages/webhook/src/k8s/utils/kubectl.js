const { ctx } = require("@modjo-plugins/core")

const kubectlRetry = require("~common/utils/kubectl-retry")

module.exports = async (kubectlArgs, options = {}) => {
  const sentry = ctx.get("sentry")
  return kubectlRetry(kubectlArgs, {
    ...options,
    sentry,
  })
}
