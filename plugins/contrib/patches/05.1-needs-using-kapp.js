const getDeps = require("../lib/get-needs-deps")

const changeRulePrefix = "kapp.k14s.io/change-rule"
const changeGroupPrefix = "kapp.k14s.io/change-group"
const changeGroupValuePrefix = "kontinuous/"
const changeRuleValuePrefix = `upsert after upserting ${changeGroupValuePrefix}`

const kindIsWaitable = require("../lib/kind-is-waitable")

module.exports = async (manifests, options, context) => {
  const { utils } = context
  const { slug } = utils
  const deps = getDeps(manifests, options, context)

  const annotationChangeGroupPrefixLength = changeGroupPrefix.length + 1
  const slugDepAnnotationKey = (key) =>
    slug(key, { maxLength: annotationChangeGroupPrefixLength })

  for (const [key, dep] of Object.entries(deps)) {
    for (const manifest of dep) {
      const annotations = manifest.metadata?.annotations
      if (!annotations) {
        continue
      }
      annotations[
        `${changeGroupPrefix}.${slugDepAnnotationKey(key)}`
      ] = `${changeGroupValuePrefix}${key}`
    }
  }

  for (const manifest of manifests) {
    const annotations = manifest.metadata?.annotations
    if (!annotations) {
      continue
    }

    const yamlNeeds = annotations["kontinuous/plugin.needs"]
    // if (annotations["kontinuous/plugin.needs"]) {
    //   delete annotations["kontinuous/plugin.needs"]
    // }

    if (!kindIsWaitable(manifest.kind, options.customWaitableKinds)) {
      continue
    }

    if (!yamlNeeds) {
      continue
    }
    const { yaml } = utils
    const needs = yaml.load(yamlNeeds)
    for (const need of needs) {
      annotations[
        `${changeRulePrefix}.${slugDepAnnotationKey(need)}`
      ] = `${changeRuleValuePrefix}${need}`
    }
  }

  return manifests
}
