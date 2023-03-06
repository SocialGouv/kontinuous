const runnableKinds = ["Deployment", "Job", "StatefulSet", "DaemonSet"]

module.exports = async (manifests, _options, context) => {
  const { logger, utils } = context
  const { matrix } = utils

  const requirementsMatrix = matrix({
    scope: ["requests", "limits"],
    type: ["cpu", "memory"],
  })

  for (const manifest of manifests) {
    const { kind } = manifest

    if (!runnableKinds.includes(kind)) {
      continue
    }

    const { metadata } = manifest
    const { name, namespace = "default" } = metadata

    const containers = manifest.spec?.template?.spec?.containers
    for (const container of containers) {
      const { resources = {} } = container
      for (const requirement of requirementsMatrix) {
        const scopeKey = requirement.scope
        const typeKey = requirement.type
        const scope = resources[requirement.scope] || {}

        if (!scope[typeKey]) {
          logger.warn(
            `QualityOfService(BestEffort): ${namespace}/${kind}/${name} container ${container.name} does not have ${typeKey} ${scopeKey}`
          )
        }
      }
    }
  }
}
