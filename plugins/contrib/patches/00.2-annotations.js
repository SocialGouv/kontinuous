/** @type {Kontinuous.Patch.Function} */
module.exports = (manifests, _options, { config, utils }) => {
  const { deploymentLabelKey, deploymentLabelValue } = config

  const templateLabelKinds = utils.rolloutStatusHandledKinds

  /**
   * @param {Kontinuous.Manifest} manifest
   * @returns {manifest is Kontinuous.ManifestWithTemplate} // typeguard to mark manifest
   */
  function hasTemplateKind(manifest) {
    return templateLabelKinds.includes(manifest.kind)
  }

  for (const manifest of manifests) {
    const { apiVersion } = manifest

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

    if (hasTemplateKind(manifest)) {
      if (!manifest.spec) {
        manifest.spec = {
          template: {},
        }
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
