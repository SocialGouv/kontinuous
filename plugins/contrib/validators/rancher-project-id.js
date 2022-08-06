module.exports = async (
  manifests,
  options,
  { config, logger, ValidationError }
) => {
  const defaultRequired = !config.isLocal

  const { required = defaultRequired } = options
  const rancherNsMissingProjectId = []
  for (const manifest of manifests) {
    if (manifest.kind !== "Namespace") {
      continue
    }
    const annotation =
      manifest.metadata?.annotations?.["field.cattle.io/projectId"]
    if (annotation !== undefined && !annotation) {
      rancherNsMissingProjectId.push(manifest)
    }
  }

  if (rancherNsMissingProjectId.length === 0) {
    return
  }

  const namespaceNames = rancherNsMissingProjectId.map(
    (manifest) => manifest.metadata.name
  )

  const message = `empty required annotation "field.cattle.io/projectId", if you are on local dev environment, you should put "isLocal: true" in ~/.kontinuous/config.yaml to fix this error`
  const data = {
    namespaces: namespaceNames,
  }

  if (required) {
    throw new ValidationError(message, data)
  } else if (!config.isLocal) {
    logger.warn(data, message)
  }
}
