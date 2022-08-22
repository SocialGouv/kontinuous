const micromatch = require("micromatch")

const changeRulePrefix = "kapp.k14s.io/change-rule"
const changeGroupPrefix = "kapp.k14s.io/change-group"
const changeGroupValuePrefix = "kontinuous/"
const changeRuleValuePrefix = "upsert after upserting kontinuous/"

const getChangeGroupOf = (manifest) => {
  const changeGroups = new Set()
  for (const [key, group] of Object.entries(manifest.metadata.annotations)) {
    if (key === changeGroupPrefix || key.startsWith(`${changeGroupPrefix}.`)) {
      changeGroups.add(group.slice(changeGroupValuePrefix.length))
    }
  }
  return changeGroups
}

const findDependentsOfGroup = (manifests, changeGroups) =>
  manifests.filter((manifest) => {
    for (const [key, rule] of Object.entries(manifest.metadata.annotations)) {
      if (
        (key === changeRulePrefix || key.startsWith(`${changeRulePrefix}.`)) &&
        rule.startsWith(changeRuleValuePrefix)
      ) {
        const need = rule.slice(changeRuleValuePrefix.length)
        return changeGroups.has(need)
      }
    }
    return false
  })

const findDependentsOf = (manifests, neededManifest) => {
  const changeGroups = getChangeGroupOf(neededManifest)
  return findDependentsOfGroup(manifests, changeGroups)
}

const unbindDependentsOf = (manifests, neededManifest) => {
  const changeGroups = getChangeGroupOf(neededManifest)
  const manifestToUnbind = findDependentsOfGroup(manifests, changeGroups)
  for (const manifest of manifestToUnbind) {
    const { annotations } = manifest.metadata
    for (const [key, rule] of Object.entries(annotations)) {
      if (
        (key === changeRulePrefix || key.startsWith(`${changeRulePrefix}.`)) &&
        rule.startsWith(changeRuleValuePrefix)
      ) {
        const need = rule.slice(changeRuleValuePrefix.length)
        if (changeGroups.has(need)) {
          delete annotations[key]
        }
      }
    }
  }
}

const removeDependentsOf = (
  manifests,
  neededManifest,
  removeManifests = new Set()
) => {
  const manifestToUnbind = findDependentsOf(manifests, neededManifest)
  for (const manifest of manifestToUnbind) {
    removeManifests.add(manifest)
  }
  return removeManifests
}

module.exports = async (manifests, _options, context) => {
  const { config, utils } = context
  const { yaml } = utils
  const { changedPaths } = config

  const removeManifests = new Set()
  for (const manifest of manifests) {
    const annotations = manifest.metadata?.annotations || {}
    const onChangedPathsStr = annotations["kontinuous/plugin.onChangedPaths"]
    if (!onChangedPathsStr) {
      continue
    }
    let onChangedPaths = yaml.load(onChangedPathsStr)
    if (!Array.isArray(onChangedPaths)) {
      onChangedPaths = [onChangedPaths]
    }

    const changed = changedPaths.some((p) =>
      micromatch.isMatch(p, onChangedPaths)
    )

    const isFirstPushOnBranch = changedPaths.length === 0

    const onChangedAnnotate = annotations["kontinuous/plugin.onChangedAnnotate"]
    if (onChangedAnnotate) {
      annotations["kontinuous/hasChanged"] = changed ? "true" : "false"
      annotations["kontinuous/isFirstPushOnBranch"] = isFirstPushOnBranch
        ? "true"
        : "false"
    }

    if (changed || isFirstPushOnBranch) {
      continue
    }

    if (!onChangedAnnotate) {
      removeManifests.add(manifest)
    }

    const onChangedNeeds = annotations["kontinuous/plugin.onChangedNeeds"]

    switch (onChangedNeeds) {
      case "unbind": {
        unbindDependentsOf(manifests, manifest)
        break
      }
      case "cascade": {
        removeDependentsOf(manifests, manifest, removeManifests)
        break
      }
      default: {
        if (!onChangedNeeds) {
          break
        }
        throw new Error(
          `unexpected value "${onChangedNeeds}" for "onChangedNeeds", expected one of: "unbind","cascade"`
        )
      }
    }
  }

  manifests = manifests.filter((manifest) => !removeManifests.has(manifest))

  return manifests
}
