module.exports = async (manifests, options, { utils }) => {
  const { enabled: enabledDefault } = options

  const enabledByKind = {
    Statefulset: false,
    Deployment: false,
    Job: true,
    ...(options.enabledByKind || {}),
  }

  const { kindIsRunnable } = utils

  for (const manifest of manifests) {
    const pluginLog = manifest.metadata?.annotations?.["kontinuous/plugin.log"]

    const { kind } = manifest
    if (!kindIsRunnable(kind)) {
      if (pluginLog !== undefined) {
        delete manifest.metadata.annotations["kontinuous/plugin.log"]
      }
      continue
    }

    if (pluginLog !== undefined) {
      continue
    }

    if (!manifest.metadata) {
      manifest.metadata = {}
    }
    if (!manifest.metadata.annotations) {
      manifest.metadata.annotations = {}
    }

    const logEnabled =
      enabledByKind[kind] !== undefined ? enabledByKind[kind] : enabledDefault

    manifest.metadata.annotations["kontinuous/plugin.log"] =
      logEnabled.toString()
  }
}
