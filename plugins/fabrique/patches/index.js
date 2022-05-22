const patches = [
  require("../charts/recommended/patches"),
  
  require("./cert-letsencrypt-issuer"),
  require("./cert-wildcard"),
]

module.exports = async (manifests, options, context, scope) => {
  for (const patch of patches) {
    manifests = await patch(manifests, options, context, scope)
  }
  return manifests
}
