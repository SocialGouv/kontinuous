const changeRulePrefix = "kapp.k14s.io/change-rule"
const changeGroupPrefix = "kapp.k14s.io/change-group"

module.exports = (manifests, _options, { utils }) => {
  const { KontinuousPluginError } = utils
  const changeGroups = new Set()
  for (const manifest of manifests) {
    const annotations = manifest.metadata?.annotations
    if (!annotations) {
      continue
    }
    for (const [key, value] of Object.entries(annotations)) {
      if (
        key === changeGroupPrefix ||
        key.startsWith(`${changeGroupPrefix}.`)
      ) {
        changeGroups.add(value)
      }
    }
  }
  for (const manifest of manifests) {
    const annotations = manifest.metadata?.annotations
    if (!annotations) {
      continue
    }
    for (const [key, value] of Object.entries(annotations)) {
      if (key === changeRulePrefix || key.startsWith(`${changeRulePrefix}.`)) {
        const required = value.split(" ").pop()
        if (!changeGroups.has(required)) {
          const requiredName = key.slice(changeRulePrefix.length + 1)
          const requirerName = `${manifest.kind}.${manifest.metadata.name}`
          throw new KontinuousPluginError(
            `missing component "${requiredName}" required by needs of "${requirerName}"`
          )
        }
      }
    }
  }
}
