const changeRulePrefix = "kapp.k14s.io/change-rule"
const changeGroupPrefix = "kapp.k14s.io/change-group"
const changeGroupValuePrefix = "kontinuous/"
const changeRuleValuePrefix = `upsert after upserting ${changeGroupValuePrefix}`

const runKinds = ["Deployment", "StatefulSet", "DaemonSet", "Job"]

module.exports = async (manifests, _options, context) => {
  const { values } = context

  const namespace = values.global.namespace || "default"
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

    // add change-group
    const chartPath = annotations["kontinuous/chartPath"]
    if (chartPath) {
      const name = chartPath.split(".").pop()
      annotations[changeGroupPrefix] = `${changeGroupValuePrefix}${namespace}`

      annotations[
        `${changeGroupPrefix}.${name}`
      ] = `${changeGroupValuePrefix}${name}.${namespace}`
    }

    // add stage if any
    const stage = annotations["kontinuous/plugin.stage"]
    if (stage) {
      annotations[
        `${changeGroupPrefix}.kontinuous-stage`
      ] = `${changeGroupValuePrefix}/${stage}.${namespace}`
    }

    // add change-rules
    if (!jsonNeeds) {
      continue
    }
    const needs = JSON.parse(jsonNeeds)
    for (const need of needs) {
      annotations[
        `${changeRulePrefix}.${need}`
      ] = `${changeRuleValuePrefix}${need}.${namespace}`
    }
  }

  return manifests
}
