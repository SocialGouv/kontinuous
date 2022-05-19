const patches = [require("./namespace"), require("./kapp")]

module.exports = async (manifests, options, context, scope) => {
  for (const patch of patches) {
    manifests = await patch(manifests, options, context, scope)
  }
  return manifests
}
