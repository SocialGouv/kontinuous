const ctx = require("~common/ctx")

const kubectlRetry = require("~common/utils/kubectl-retry")

const needKubectl = require("~common/utils/need-kubectl")
const needBin = require("~/lib/need-bin")

module.exports = async (kubectlArgs, options = {}) => {
  await needBin(needKubectl)

  const sentry = ctx.get("sentry")

  return kubectlRetry(kubectlArgs, {
    ...options,
    sentry,
  })
}
