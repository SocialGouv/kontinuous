const yaml = require("js-yaml")

const removeNulls = require("~/utils/remove-nulls")

module.exports = async (manifestsDocument, values) => {
  const defaultNamespace = values.global.namespace
  const iterator = yaml.loadAll(manifestsDocument)
  const manifests = []

  const uniqNames = new Set()

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

    if (manifest.metadata?.name) {
      const n = `${manifest.kind}.${manifest.metadata.namespace}.${manifest.metadata.name}`
      if (uniqNames.has(n)) {
        throw new Error(`Duplicate ressource for ${manifest.metadata.name}`)
      }
      uniqNames.add(n)
    }

    removeNulls(manifest)

    manifests.push(yaml.dump(manifest))
  }
  return manifests.join("---\n")
}
