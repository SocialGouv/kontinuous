module.exports = (manifest) => {
  if (manifest.kind !== "Namespace") {
    if (!manifest.metadata) {
      manifest.metadata = {}
    }
    if (!manifest.metadata.annotations) {
      manifest.metadata.annotations = {}
    }
    manifest.metadata.annotations["kapp.k14s.io/disable-original"] = ""
  }
  return manifest
}
