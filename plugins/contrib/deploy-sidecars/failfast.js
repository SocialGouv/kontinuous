const rolloutStatusManifest = require("../lib/rollout-status-manifests")

module.exports = async (sidecars, _options, context) => {
  const { stop: stopSidecar, promise } = await rolloutStatusManifest(context)
  sidecars.push({ stopSidecar, promise })
}
