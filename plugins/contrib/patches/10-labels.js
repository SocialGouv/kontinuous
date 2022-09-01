module.exports = (manifests, _options, { utils, config }) => {
  const { slug } = utils

  const { gitBranch } = config

  const ref = slug(gitBranch)

  for (const manifest of manifests) {
    if (!manifest.metadata) {
      manifest.metadata = {}
    }
    if (!manifest.metadata.labels) {
      manifest.metadata.labels = {}
    }
    manifest.metadata.labels["kontinuous/ref"] = ref
    manifest.metadata.labels["app.kubernetes.io/managed-by"] = "kontinuous"
    manifest.metadata.labels["app.kubernetes.io/created-by"] = "kontinuous"
  }

  return manifests
}
