const ctx = require("~common/ctx")

const rolloutStatus = require("~common/utils/rollout-status")

const needRolloutStatus = require("~common/utils/need-rollout-status")
const needBin = require("~/lib/need-bin")

module.exports = async (options) => {
  await needBin(needRolloutStatus)

  const sentry = ctx.get("sentry")

  return rolloutStatus({
    ...options,
    sentry,
  })
}
