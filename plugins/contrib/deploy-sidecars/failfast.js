const rolloutStatusManifest = require("../lib/rollout-status-manifests")

module.exports = async (options, context) => {
  const { customWaitableKinds } = options
  await rolloutStatusManifest(context, { customWaitableKinds })
}
