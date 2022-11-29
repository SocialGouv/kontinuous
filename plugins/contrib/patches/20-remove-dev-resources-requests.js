const runnableKinds = ["Deployment", "Job", "StatefulSet", "DaemonSet"]

const removeContainersRequests = (containers = []) => {
  for (const container of containers) {
    if (container.resources?.requests !== undefined) {
      delete container.resources.requests
    }
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
