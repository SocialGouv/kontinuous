module.exports = (manifests) => {
  const uniqNames = new Set()
  for (const manifest of manifests) {
    if (manifest.metadata?.name) {
      const n = `${manifest.kind}.${manifest.metadata.namespace}.${manifest.metadata.name}`
      if (uniqNames.has(n)) {
        throw new Error(`Duplicate ressource for ${manifest.metadata.name}`)
      }
      uniqNames.add(n)
    }
  }
}
