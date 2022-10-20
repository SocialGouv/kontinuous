const templateLabelKinds = ["Job", "Deployment", "StatefulSet", "DaemonSet"]

module.exports = (manifests, _options, { config, utils }) => {
  const { refLabelKey, refLabelValue } = config

  const { slug } = utils

  for (const manifest of manifests) {
    const { kind, apiVersion } = manifest

    if (apiVersion.startsWith("kapp.k14s.io")) {
      continue
    }

    if (!manifest.metadata) {
      manifest.metadata = {}
    }
    if (!manifest.metadata.labels) {
      manifest.metadata.labels = {}
    }

    const name = kind === "Namespace" ? manifest.name : manifest.metadata.name

    const labels = {
      [refLabelKey]: refLabelValue,
      "kontinuous/resourceName": slug([kind, name]),
      // "app.kubernetes.io/managed-by": "kontinuous", // incompatible with helm deployment
      // "app.kubernetes.io/created-by": "kontinuous", // incompatible with helm deployment
      "app.kubernetes.io/manifest-managed-by": "kontinuous",
      "app.kubernetes.io/manifest-created-by": "kontinuous",
    }

    Object.assign(manifest.metadata.labels, labels)

    if (templateLabelKinds.includes(kind)) {
      if (!manifest.spec) {
        manifest.spec = {}
      }
      if (!manifest.spec.template) {
        manifest.spec.template = {}
      }
      if (!manifest.spec.template.metadata) {
        manifest.spec.template.metadata = {}
      }
      if (!manifest.spec.template.metadata.labels) {
        manifest.spec.template.metadata.labels = {}
      }
      Object.assign(manifest.spec.template.metadata.labels, labels)
    }
  }

  return manifests
}
