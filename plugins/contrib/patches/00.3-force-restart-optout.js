module.exports = (manifests, _options, { config }) => {
  const { deploymentLabelKey } = config

  for (const manifest of manifests) {
    if (
      manifest.metadata?.annotations?.["kontinuous/plugin.forceRestart"] ===
      "false"
    ) {
      if (manifest.spec.template?.metadata?.annotations?.[deploymentLabelKey]) {
        delete manifest.spec.template.metadata.annotations[deploymentLabelKey]
      }
      if (manifest.spec.template?.metadata?.labels?.[deploymentLabelKey]) {
        delete manifest.spec.template.metadata.labels[deploymentLabelKey]
      }
    }
  }
}
