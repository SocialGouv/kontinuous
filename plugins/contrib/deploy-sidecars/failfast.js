const rolloutStatus = require("../lib/rollout-status")

module.exports = async (sidecars, _options, context) => {
  const { stop: stopSidecar, promise } = await rolloutStatus(context)
  sidecars.push({ stopSidecar, promise })
}
