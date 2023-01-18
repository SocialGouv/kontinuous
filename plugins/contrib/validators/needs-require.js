const getDeps = require("../lib/get-needs-deps")
const getDepName = require("../lib/get-needs-dep-name")

module.exports = (manifests, _options, context) => {
  const { utils } = context

  const { KontinuousPluginError, kindIsRunnable } = utils
  const deps = getDeps(manifests, context)
  for (const manifest of manifests) {
    const { metadata, kind } = manifest
    const annotations = metadata?.annotations
    if (!annotations) {
      continue
    }
    const jsonNeeds = annotations["kontinuous/plugin.needs"]
    if (!kindIsRunnable(kind)) {
      continue
    }
    if (!jsonNeeds) {
      continue
    }
    const needs = JSON.parse(jsonNeeds)
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
