module.exports = (manifests, options, { config, values }) => {
  if (config.environment !== "dev") {
    return manifests
  }

  const {
    permanentDevEnvironmentBranches = ["master", "main", "dev", "develop"],
  } = options

  if (permanentDevEnvironmentBranches.includes(config.gitBranch)) {
    return
  }

  const ttl =
    (values && (values.ttl || (values.global && values.global.ttl))) || "7d"

  for (const manifest of manifests) {
    if (manifest.kind === "Namespace") {
      if (!manifest.metadata) {
        manifest.metadata = {}
      }
      if (!manifest.metadata.annotations) {
        manifest.metadata.annotations = {}
      }
      manifest.metadata.annotations["janitor/ttl"] = ttl
    }
  }

  return manifests
}
