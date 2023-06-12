module.exports = (manifests, options) => {
  const { defaultStorageClassName } = options
  if (!defaultStorageClassName) {
    return
  }
  const clusterManifests = manifests.filter((m) => m.kind === "Cluster")
  const undefinedStorageClassManifests = clusterManifests.filter(
    (m) =>
      m.spec.storage?.storageClass === undefined ||
      m.spec.storage?.storageClass === null ||
      m.spec.storage?.storageClass === ""
  )
  for (const manifest of undefinedStorageClassManifests) {
    manifest.spec.storage.storageClass = defaultStorageClassName
  }
}
