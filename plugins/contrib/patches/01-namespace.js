const defaultOptions = {
  overrideDefault: true,
}
module.exports = (manifests, options, { values }) => {
  const opts = { ...defaultOptions, ...options }
  const { overrideDefault } = opts
  for (const manifest of manifests) {
    const { kind, apiVersion } = manifest
    if (kind !== "Namespace" && !apiVersion.startsWith("kapp.k14s.io")) {
      if (!manifest.metadata) {
        manifest.metadata = {}
      }
      if (
        !manifest.metadata.namespace ||
        (overrideDefault && manifest.metadata.namespace === "default")
      ) {
        manifest.metadata.namespace = values.global.namespace
      }
    }
  }
  return manifests
}
