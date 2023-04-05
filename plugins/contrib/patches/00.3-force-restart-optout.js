module.exports = (manifests, _options, { config }) => {
  const { deploymentLabelKey, refLabelKey } = config

  const cleanKeys = [
    deploymentLabelKey,
    refLabelKey,
    "kontinuous/gitSha",
    "kontinuous/appVersion",
  ]
  for (const manifest of manifests) {
    if (
      manifest.metadata?.annotations?.["kontinuous/plugin.forceRestart"] ===
      "false"
    ) {
      for (const key of cleanKeys) {
        if (manifest.spec.template?.metadata?.annotations?.[key]) {
          delete manifest.spec.template.metadata.annotations[key]
        }
        if (manifest.spec.template?.metadata?.labels?.[key]) {
          delete manifest.spec.template.metadata.labels[key]
        }
      }
    }
  }
}
