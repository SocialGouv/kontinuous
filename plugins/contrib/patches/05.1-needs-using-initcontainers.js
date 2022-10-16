const runKinds = ["Deployment", "StatefulSet", "DaemonSet", "Job"]

module.exports = async (manifests, _options, _context) => {
  const waitForGroups = {}

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

    // register wait-for chart
    const chartPath = annotations["kontinuous/chartPath"]
    if (chartPath) {
      const name = chartPath.split(".").pop()
      waitForGroups[name] = manifest
    }

    // register wait-for stage
    const stage = annotations["kontinuous/plugin.stage"]
    if (stage) {
      waitForGroups[stage] = manifest
    }

    // add change-rules
    if (!jsonNeeds) {
      continue
    }
    // const needs = JSON.parse(jsonNeeds)
    // for (const need of needs) {
    //   annotations[
    //     `${changeRulePrefix}.${need}`
    //   ] = `${changeRuleValuePrefix}${need}.${namespace}`
    // }
  }

  return manifests
}
