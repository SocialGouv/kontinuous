/** @type {Kontinuous.PatchFunction} */
module.exports = async (manifests, _options, context) => {
  const { config, utils } = context
  const { slug } = utils
  const { repositoryName, ciNamespace } = config

  const charts = config.chart?.join(",")

  const helmRelease = slug(
    `${repositoryName}-${config.gitBranch}${charts ? `-${charts}` : ""}`
  )

  manifests.forEach((manifest) => {
    if (!manifest.metadata) {
      manifest.metadata = {}
    }
    if (!manifest.metadata.labels) {
      manifest.metadata.labels = {}
    }
    if (!manifest.metadata.annotations) {
      manifest.metadata.annotations = {}
    }
    manifest.metadata.labels["app.kubernetes.io/managed-by"] = "Helm"
    manifest.metadata.annotations["meta.helm.sh/release-name"] = helmRelease
    manifest.metadata.annotations["meta.helm.sh/release-namespace"] =
      ciNamespace
  })

  return manifests
}
