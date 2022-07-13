const fs = require("fs-extra")
const yaml = require("~common/utils/yaml")

const removeNulls = require("~common/utils/remove-nulls")

module.exports = async (manifestsDocument, config) => {
  let iterator
  try {
    iterator = yaml.loadAll(manifestsDocument)
  } catch (err) {
    await fs.writeFile(
      `${config.buildPath}/manifests.with-parse-error.yaml`,
      manifestsDocument
    )
    throw err
  }

  const manifests = []

  for (const manifest of iterator) {
    if (!manifest) {
      continue
    }
    removeNulls(manifest)
    manifests.push(manifest)
  }
  return manifests
}
