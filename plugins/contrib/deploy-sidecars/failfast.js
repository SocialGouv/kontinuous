const rolloutStatusManifest = require("../lib/rollout-status-manifests")

module.exports = async (_options, context) => {
  await rolloutStatusManifest(context)
}
