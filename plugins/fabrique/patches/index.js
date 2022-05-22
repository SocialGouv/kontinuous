const dependenciesPatches = ["../charts/recommended/patches"]

const patches = [
  ...dependenciesPatches.map((patch) => require(patch)),

  require("./cert-letsencrypt-issuer"),
  require("./cert-wildcard"),
]

module.exports = async (manifests, options, context, scope) => {
  for (const patch of patches) {
    manifests = await patch(manifests, options, context, scope)
  }
  return manifests
}
