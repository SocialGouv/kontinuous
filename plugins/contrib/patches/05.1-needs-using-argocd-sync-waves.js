const getDeps = require("../lib/get-needs-deps")
const getDepName = require("../lib/get-needs-dep-name")

const kindIsWaitable = require("../lib/kind-is-waitable")

module.exports = async (manifests, options, context) => {
  const { utils } = context
  const { yaml } = utils
  const deps = getDeps(manifests, options, context)

  const recursiveFindDependencyDeepnessLevel = (manifest, parentLevel = 0) => {
    let level = parentLevel
    const annotations = manifest.metadata?.annotations
    if (!annotations) {
      return level
    }
    if (!kindIsWaitable(manifest.kind, options.customWaitableKinds)) {
      return level
    }
    const yamlNeeds = annotations["kontinuous/plugin.needs"]
    if (!yamlNeeds) {
      return level
    }

    const dependantName = getDepName(manifest)
    const needs = yaml.load(yamlNeeds)

    for (const need of needs) {
      const matchingDeps = deps[need]
      for (const m of matchingDeps) {
        const dependencyName = getDepName(m)
        if (dependantName === dependencyName) {
          continue
        }
        level = Math.max(
          level,
          recursiveFindDependencyDeepnessLevel(m, parentLevel + 1)
        )
      }
    }
    return level
  }

  for (const manifest of manifests) {
    const deepnessLevel = recursiveFindDependencyDeepnessLevel(manifest, 0)
    if (deepnessLevel === 0) {
      continue
    }
    manifest.metadata.annotations["argocd.argoproj.io/sync-wave"] =
      deepnessLevel.toString()
  }

  return manifests
}
