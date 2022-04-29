const yaml = require("~common/utils/yaml")

const removeNulls = require("~common/utils/remove-nulls")

module.exports = async (manifestsDocument) => {
  const iterator = yaml.loadAll(manifestsDocument)
  const manifests = []

  for (let manifest of iterator) {
    if (!manifest) {
      continue
    }
    removeNulls(manifest)
    manifests.push(manifest)
  }
  return manifests
}
