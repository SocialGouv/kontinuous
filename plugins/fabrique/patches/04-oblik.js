module.exports = async (manifests, _options, _context) => {
  const labelKey = "oblik.socialgouv.io/enabled"
  const labelValue = "true"

  const targetKinds = [
    "cluster.postgresql.cnpg.io",
    "cronjob.batch",
    "deployment.apps",
    "statefulset.apps",
  ]

  const addLabelIfMissing = (manifest) => {
    if (!manifest.metadata.labels) {
      manifest.metadata.labels = {}
    }
    if (!manifest.metadata.labels[labelKey]) {
      manifest.metadata.labels[labelKey] = labelValue
    }
  }

  for (const manifest of manifests) {
    const kind = manifest.kind.toLowerCase()
    const apiGroup = manifest.apiVersion.split("/")[0].toLowerCase()
    const key = `${kind}.${apiGroup}`

    if (targetKinds.includes(key)) {
      addLabelIfMissing(manifest)
    }
  }
}
