const ctx = require("~common/ctx")

const rolloutStatus = require("~common/utils/rollout-status")

module.exports = async (options) => {
  const sentry = ctx.get("sentry")

  return rolloutStatus({
    ...options,
    sentry,
  })
}
