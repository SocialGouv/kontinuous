const runnableKinds = ["Deployment", "Job", "StatefulSet", "DaemonSet"]

const removeContainersRequests = (containers = []) => {
  for (const container of containers) {
    if (!container.resources) {
      container.resources = {}
    }
    container.resources.requests = { cpu: 0, memory: 0 }
  }
}

module.exports = (manifests, _options, { config }) => {
  if (config.environment !== "dev") {
    return manifests
  }

  for (const manifest of manifests) {
    const { kind } = manifest

    if (!runnableKinds.includes(kind)) {
      continue
    }

    removeContainersRequests(manifest.spec?.template?.spec?.containers)
    removeContainersRequests(manifest.spec?.template?.spec?.initContainers)
  }

  return manifests
}
