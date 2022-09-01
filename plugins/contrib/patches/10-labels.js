module.exports = (manifests, _options, { config, utils }) => {
  const { refLabelKey, refLabelValue } = config

  const { slug } = utils

  for (const manifest of manifests) {
    const { kind, apiVersion } = manifest

    if (apiVersion.startsWith("kapp.k14s.io")) {
      continue
    }

    if (!manifest.metadata) {
      manifest.metadata = {}
    }
    if (!manifest.metadata.labels) {
      manifest.metadata.labels = {}
    }

    manifest.metadata.labels[refLabelKey] = refLabelValue

    const name = kind === "Namespace" ? manifest.name : manifest.metadata.name
    manifest.metadata.labels["kontinuous/resourceName"] = slug([kind, name])

    manifest.metadata.labels["app.kubernetes.io/managed-by"] = "kontinuous"
    manifest.metadata.labels["app.kubernetes.io/created-by"] = "kontinuous"
  }

  return manifests
}
