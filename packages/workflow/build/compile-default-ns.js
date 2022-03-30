const yaml = require("js-yaml")

module.exports = async (manifestsDocument, values) => {
  const defaultNamespace = values.global.namespace
  const iterator = yaml.loadAll(manifestsDocument)
  const manifests = []
  for (const manifest of iterator) {
    if (!manifest) {
      continue
    }
    if (manifest.kind !== "Namespace") {
      if (!manifest.metadata) {
        manifest.metadata = {}
      }
      if (!manifest.metadata.namespace) {
        manifest.metadata.namespace = defaultNamespace
      }
    }
    manifests.push(yaml.dump(manifest))
  }
  return manifests.join("---\n")
}
