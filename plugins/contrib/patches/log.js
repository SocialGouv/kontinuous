module.exports = async (manifests, options, { utils }) => {
  const { enabled: enabledDefault = true } = options
  const { kindIsRunnable } = utils

  for (const manifest of manifests) {
    const pluginLog = manifest.metadata?.annotations?.["kontinuous/plugin.log"]

    if (!kindIsRunnable(manifest.kind)) {
      if (pluginLog !== undefined) {
        delete manifest.metadata.annotations["kontinuous/plugin.log"]
      }
      continue
    }

    if (pluginLog === undefined) {
      if (!manifest.metadata) {
        manifest.metadata = {}
      }
      if (!manifest.metadata.annotations) {
        manifest.metadata.annotations = {}
      }
      manifest.metadata.annotations["kontinuous/plugin.log"] =
        enabledDefault.toString()
    }
  }
}
