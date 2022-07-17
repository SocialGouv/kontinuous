const micromatch = require("micromatch")

module.exports = async (manifests, _options, context) => {
  const { config, utils } = context
  const { yaml } = utils
  const { commits } = config
  const changedPaths = Object.values(commits).flatMap((value) => value)
  manifests = manifests.filter((manifest) => {
    const onChangedPathsStr =
      manifest.metadata?.annotations?.["kontinuous/onChangedPaths"]
    if (!onChangedPathsStr) {
      return true
    }
    let onChangedPaths = yaml.load(onChangedPathsStr)
    if (!Array.isArray(onChangedPaths)) {
      onChangedPaths = [onChangedPaths]
    }
    return changedPaths.some((p) => micromatch.isMatch(p, onChangedPaths))
  })
  return manifests
}
