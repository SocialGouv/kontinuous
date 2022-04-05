module.exports = (manifest, values) => {
  if (manifest.kind !== "Namespace") {
    if (!manifest.metadata) {
      manifest.metadata = {}
    }
    if (!manifest.metadata.namespace) {
      manifest.metadata.namespace = values.global.namespace
    }
  }
  return manifest
}
