const fs = require("fs-extra")
const set = require("lodash.set")

const yaml = require("~common/utils/yaml")

const removeNulls = require("~common/utils/remove-nulls")

const sourcePrefix = "kontinuous-umbrella/charts/"

module.exports = async (manifestsDocument, config) => {
  manifestsDocument = manifestsDocument.replaceAll(
    "---\n# Source: ",
    "---\nsource: "
  )

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

  let currentSource
  for (const manifest of iterator) {
    if (!manifest) {
      continue
    }
    const keys = Object.keys(manifest)
    if (keys.length === 1 && keys.includes("source")) {
      currentSource = manifest.source
      continue
    }

    removeNulls(manifest)

    if (!manifest.source && currentSource) {
      manifest.source = currentSource
    }

    let { source } = manifest
    if (source) {
      if (source.startsWith(sourcePrefix)) {
        source = source.slice(sourcePrefix.length)
        const fragments = source.split("/charts/")
        fragments.push(fragments.pop().split("/").shift())
        const chartPath = fragments.join(".")
        set(manifest, "metadata.annotations[kontinuous/chartPath]", chartPath)
      }
      delete manifest.source
    }
    set(manifest, "metadata.annotations[kontinuous/source]", source)
    manifests.push(manifest)
  }

  return manifests
}
