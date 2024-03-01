module.exports = (manifests, options) => {
  const { affinityToAdd = {}, tolerationsToAdd = [] } = options
  for (const manifest of manifests) {
    if (manifest.kind !== "Job") {
      continue
    }

    if (!manifest.spec.affinity) {
      manifest.spec.affinity = { nodeAffinity: {} }
    }
    const existingPreferences =
      manifest.spec.affinity.nodeAffinity
        .preferredDuringSchedulingIgnoredDuringExecution || []
    manifest.spec.affinity.nodeAffinity.preferredDuringSchedulingIgnoredDuringExecution =
      [
        ...existingPreferences,
        ...affinityToAdd.nodeAffinity
          .preferredDuringSchedulingIgnoredDuringExecution,
      ]

    manifest.spec.tolerations = manifest.spec.tolerations || []
    const newTolerations = tolerationsToAdd.filter(
      (tolerationToAdd) =>
        !manifest.spec.tolerations.some(
          (toleration) =>
            toleration.key === tolerationToAdd.key &&
            toleration.operator === tolerationToAdd.operator &&
            toleration.value === tolerationToAdd.value &&
            toleration.effect === tolerationToAdd.effect
        )
    )
    manifest.spec.tolerations = [
      ...manifest.spec.tolerations,
      ...newTolerations,
    ]
  }
  return manifests
}
