// eslint-disable-next-line import/no-extraneous-dependencies
const hrn = require("hashed-release-name")

module.exports = async (manifests) => {
  for (const manifest of manifests) {
    if (manifest.kind !== "Namespace") {
      if (!manifest.metadata) {
        manifest.metadata = {}
      }
      if (!manifest.metadata.labels) {
        manifest.metadata.labels = {}
      }
      manifest.metadata.labels.hashwords = hrn({
        hash: `hash.${manifest.kind}.${manifest.metadata?.name}`,
        aliterative: true,
      })
    }
  }
  return manifests
}
