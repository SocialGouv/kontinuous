const yaml = require("js-yaml")

const removeNulls = require("~/utils/remove-nulls")

const { buildCtx } = require("~/build/ctx")

module.exports = async (manifestsDocument, values) => {
  const env = buildCtx.require("env")
  const { KWBUILD_PATH } = env

  const patches = require(`${KWBUILD_PATH}/patches`)

  const iterator = yaml.loadAll(manifestsDocument)
  const manifests = []

  const uniqNames = new Set()

  for (let manifest of iterator) {
    if (!manifest) {
      continue
    }

    removeNulls(manifest)

    manifest = patches(manifest, values)

    if (manifest.metadata?.name) {
      const n = `${manifest.kind}.${manifest.metadata.namespace}.${manifest.metadata.name}`
      if (uniqNames.has(n)) {
        throw new Error(`Duplicate ressource for ${manifest.metadata.name}`)
      }
      uniqNames.add(n)
    }

    manifests.push(yaml.dump(manifest))
  }
  return manifests.join("---\n")
}
