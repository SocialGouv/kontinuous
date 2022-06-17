module.exports = (manifests, _options, { values }) => {
  for (const manifest of manifests) {
    if (manifest.kind !== "Namespace") {
      if (!manifest.metadata) {
        manifest.metadata = {}
      }
      if (!manifest.metadata.namespace) {
        manifest.metadata.namespace = values.global.namespace
      }
    }
  }
  return manifests
}
