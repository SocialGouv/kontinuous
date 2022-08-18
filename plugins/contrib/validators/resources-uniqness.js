module.exports = (manifests) => {
  const uniqNames = new Set()
  for (const manifest of manifests) {
    if (manifest.metadata?.name) {
      const { metadata } = manifest
      const { namespace = "default" } = metadata
      const n = `${manifest.kind}.${namespace}.${metadata.name}`
      const nsLabel =
        manifest.kind === "Namespace" ? "" : `in namespace "${namespace}"`
      if (uniqNames.has(n)) {
        throw new Error(
          `Duplicate ressource for kind "${manifest.kind}" with name "${metadata.name}" ${nsLabel}`
        )
      }
      uniqNames.add(n)
    }
  }
}
