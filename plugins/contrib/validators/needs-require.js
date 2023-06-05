const getDeps = require("../lib/get-needs-deps")
const getDepName = require("../lib/get-needs-dep-name")
const kindIsWaitable = require("../lib/kind-is-waitable")

module.exports = (manifests, options, context) => {
  const { utils } = context

  const { KontinuousPluginError } = utils
  const deps = getDeps(manifests, options, context)
  for (const manifest of manifests) {
    const { metadata, kind } = manifest
    const annotations = metadata?.annotations
    if (!annotations) {
      continue
    }
    const yamlNeeds = annotations["kontinuous/plugin.needs"]
    if (!kindIsWaitable(kind, options.customWaitableKinds)) {
      continue
    }
    if (!yamlNeeds) {
      continue
    }
    const { yaml } = utils
    const needs = yaml.load(yamlNeeds)
    const dependantName = getDepName(manifest)
    for (const need of needs) {
      const matchingDeps = deps[need]
      if (!matchingDeps) {
        throw new KontinuousPluginError(
          `missing component "${need}" required by needs of "${dependantName}"`
        )
      }
    }
  }
}
