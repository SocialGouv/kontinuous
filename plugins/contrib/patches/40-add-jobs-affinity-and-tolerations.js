module.exports = (manifests, options) => {
  const { affinityToAdd = {}, tolerationsToAdd = [] } = options
  for (const manifest of manifests) {
    if (manifest.kind !== "Job") {
      continue
    }

    manifest.spec.template.spec = manifest.spec.template.spec || {}
    const templateSpec = manifest.spec.template.spec

    // Add or merge affinity
    templateSpec.affinity = templateSpec.affinity || {}
    templateSpec.affinity.nodeAffinity =
      templateSpec.affinity.nodeAffinity || {}
    templateSpec.affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution =
      templateSpec.affinity.nodeAffinity
        .preferredDuringSchedulingIgnoredDuringExecution || []
    const existingPreferences =
      templateSpec.affinity.nodeAffinity
        .preferredDuringSchedulingIgnoredDuringExecution
    // Avoid duplicating the affinity rules
    if (
      !existingPreferences.find((preference) =>
        preference.preference.matchExpressions[0].values.includes("prod-build")
      )
    ) {
      templateSpec.affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution.push(
        ...affinityToAdd.nodeAffinity
          .preferredDuringSchedulingIgnoredDuringExecution
      )
    }

    // Add or merge tolerations
    templateSpec.tolerations = templateSpec.tolerations || []
    const newTolerations = tolerationsToAdd.filter(
      (tolerationToAdd) =>
        !templateSpec.tolerations.some(
          (toleration) =>
            toleration.key === tolerationToAdd.key &&
            toleration.operator === tolerationToAdd.operator &&
            toleration.value === tolerationToAdd.value &&
            toleration.effect === tolerationToAdd.effect
        )
    )
    templateSpec.tolerations = [...templateSpec.tolerations, ...newTolerations]
  }
  return manifests
}
