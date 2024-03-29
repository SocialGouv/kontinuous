module.exports = (manifests, _options, { config, utils }) => {
  const {
    refLabelKey,
    refLabelValue,
    deploymentLabelKey,
    deploymentLabelValue,
    deploymentEnvLabelKey,
    deploymentEnvLabelValue,
  } = config

  const templateLabelKinds = utils.rolloutStatusHandledKinds

  const { slug, isVersionTag, sanitizeLabel } = utils

  for (const manifest of manifests) {
    const { kind, apiVersion } = manifest

    if (apiVersion?.startsWith("kapp.k14s.io")) {
      continue
    }

    if (!manifest.metadata) {
      manifest.metadata = {}
    }
    if (!manifest.metadata.labels) {
      manifest.metadata.labels = {}
    }

    const { name } = manifest.metadata

    const labels = {
      [deploymentLabelKey]: deploymentLabelValue,
      [deploymentEnvLabelKey]: deploymentEnvLabelValue,
      [refLabelKey]: refLabelValue,
      "kontinuous/gitSha": config.gitSha,
      "kontinuous/appVersion": isVersionTag(config.gitBranch)
        ? sanitizeLabel(config.gitBranch)
        : config.gitSha,
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
