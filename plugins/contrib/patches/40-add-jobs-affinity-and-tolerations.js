module.exports = (manifests, options) => {
  const {
    affinityToAdd = {},
    tolerationsToAdd = [],
    cronjobEnabled = true,
  } = options
  for (const manifest of manifests) {
    const { kind } = manifest
    if (!(kind === "Job" || (kind === "CronJob" && cronjobEnabled))) {
      continue
    }

    const parentSpec = kind === "CronJob" ? manifest.spec.jobTemplate : manifest

    parentSpec.spec.template.spec = parentSpec.spec.template.spec || {}
    const templateSpec = parentSpec.spec.template.spec

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
