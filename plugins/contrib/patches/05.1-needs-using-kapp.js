const getDeps = require("./needs/get-deps")

const changeRulePrefix = "kapp.k14s.io/change-rule"
const changeGroupPrefix = "kapp.k14s.io/change-group"
const changeGroupValuePrefix = "kontinuous/"
const changeRuleValuePrefix = `upsert after upserting ${changeGroupValuePrefix}`

module.exports = async (manifests, _options, context) => {
  const { utils } = context
  const { kindIsRunnable } = utils
  const deps = getDeps(manifests, context)

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

    if (!kindIsRunnable(manifest.kind)) {
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
