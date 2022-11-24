const templateLabelKinds = ["Job", "Deployment", "StatefulSet", "DaemonSet"]

module.exports = (manifests, _options, { config }) => {
  const { deploymentLabelKey, deploymentLabelValue } = config

  for (const manifest of manifests) {
    const { kind, apiVersion } = manifest

    if (apiVersion?.startsWith("kapp.k14s.io")) {
      continue
    }

    if (!manifest.metadata) {
      manifest.metadata = {}
    }
    if (!manifest.metadata.annotations) {
      manifest.metadata.annotations = {}
    }

    const annotations = {
      [deploymentLabelKey]: deploymentLabelValue,
    }

    Object.assign(manifest.metadata.annotations, annotations)

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
      if (!manifest.spec.template.metadata.annotations) {
        manifest.spec.template.metadata.annotations = {}
      }
      Object.assign(manifest.spec.template.metadata.annotations, annotations)
    }
  }

  return manifests
}
