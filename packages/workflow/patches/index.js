const patches = ["defaults"]

module.exports = (manifest, values) => {
  for (const patch of patches) {
    manifest = require(`./${patch}`)(manifest, values)
  }
  return manifest
}
