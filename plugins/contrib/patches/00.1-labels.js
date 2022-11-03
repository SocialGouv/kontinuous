const templateLabelKinds = ["Job", "Deployment", "StatefulSet", "DaemonSet"]

module.exports = (manifests, _options, { config, utils }) => {
  const {
    refLabelKey,
    refLabelValue,
    deploymentLabelKey,
    deploymentLabelValue,
    deploymentEnvLabelKey,
    deploymentEnvLabelValue,
  } = config

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
    if (!manifest.metadata.annotations) {
      manifest.metadata.annotations = {}
    }

    const name = kind === "Namespace" ? manifest.name : manifest.metadata.name

    const labels = {
      [deploymentLabelKey]: deploymentLabelValue,
      [deploymentEnvLabelKey]: deploymentEnvLabelValue,
      [refLabelKey]: refLabelValue,
      "kontinuous/resourceName": slug([kind, name]),
      // "app.kubernetes.io/managed-by": "kontinuous", // incompatible with helm deployment
      // "app.kubernetes.io/created-by": "kontinuous", // incompatible with helm deployment
      "app.kubernetes.io/manifest-managed-by": "kontinuous",
      "app.kubernetes.io/manifest-created-by": "kontinuous",
    }

    const annotations = {
      [deploymentLabelKey]: deploymentLabelValue,
    }

    Object.assign(manifest.metadata.labels, labels)
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
      if (!manifest.spec.template.metadata.labels) {
        manifest.spec.template.metadata.labels = {}
      }
      if (!manifest.spec.template.metadata.annotations) {
        manifest.spec.template.metadata.annotations = {}
      }
      Object.assign(manifest.spec.template.metadata.labels, labels)
      Object.assign(manifest.spec.template.metadata.annotations, annotations)
    }
  }

  return manifests
}
