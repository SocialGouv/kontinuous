const dependenciesPatches = ["../charts/recommended/patches"]

const patches = [
  ...dependenciesPatches.map((patch) => require(patch)),

  require("./cert-letsencrypt-issuer"),
  require("./cert-wildcard"),
  require("./rancher-project-id"),
]

module.exports = async (manifests, options, context, scope) => {
  for (const patch of patches) {
    const result = await patch(manifests, options, context, scope)
    if (result) {
      manifests = result
    }
  }
  return manifests
}
