module.exports = (manifests, _options, { values }) => {
  for (const manifest of manifests) {
    const { kind, apiVersion } = manifest
    if (kind !== "Namespace" && !apiVersion.startsWith("kapp.k14s.io")) {
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
