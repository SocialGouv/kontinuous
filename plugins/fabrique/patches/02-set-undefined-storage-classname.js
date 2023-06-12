module.exports = (manifests, options) => {
  const { defaultStorageClassName = "azurefile" } = options
  const pvcManifests = manifests.filter(
    (m) => m.kind === "PersistentVolumeClaim"
  )
  const undefinedStorageClassPvcManifests = pvcManifests.filter(
    (m) =>
      m.spec.storageClassName === undefined ||
      m.spec.storageClassName === null ||
      m.spec.storageClassName === ""
  )
  for (const manifest of undefinedStorageClassPvcManifests) {
    manifest.spec.storageClassName = defaultStorageClassName
  }
}
