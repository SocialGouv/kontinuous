const patches = ["namespace", "kapp"]

module.exports = (manifest, values) => {
  for (const patch of patches) {
    // eslint-disable-next-line import/no-extraneous-dependencies
    manifest = require(`./${patch}`)(manifest, values)
  }
  return manifest
}
