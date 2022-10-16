const changeRulePrefix = "kapp.k14s.io/change-rule"
const changeGroupPrefix = "kapp.k14s.io/change-group"
const changeGroupValuePrefix = "kontinuous/"
const changeRuleValuePrefix = `upsert after upserting ${changeGroupValuePrefix}`

const runKinds = ["Deployment", "StatefulSet", "DaemonSet", "Job"]

const getDeps = require("./needs/get-deps")

module.exports = async (manifests, _options, _context) => {
  const deps = getDeps(manifests)

  for (const [key, dep] of Object.entries(deps)) {
    for (const manifest of dep) {
      const annotations = manifest.metadata?.annotations
      if (!annotations) {
        continue
      }
      annotations[
        `${changeGroupPrefix}.${key}`
      ] = `${changeGroupValuePrefix}${key}`
    }
  }

  for (const manifest of manifests) {
    const annotations = manifest.metadata?.annotations
    if (!annotations) {
      continue
    }

    const jsonNeeds = annotations["kontinuous/plugin.needs"]
    if (annotations["kontinuous/plugin.needs"]) {
      delete annotations["kontinuous/plugin.needs"]
    }

    if (!runKinds.includes(manifest.kind)) {
      continue
    }

    if (!jsonNeeds) {
      continue
    }
    const needs = JSON.parse(jsonNeeds)
    for (const need of needs) {
      annotations[
        `${changeRulePrefix}.${need}`
      ] = `${changeRuleValuePrefix}${need}`
    }
  }

  return manifests
}
