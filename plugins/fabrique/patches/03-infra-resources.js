module.exports = async (manifests, options, context) => {
  const { utils, config } = context
  const { getRepositoryFile, deepmerge, yaml } = utils

  const remoteConfigPath = `projects/${config.projectName}/${config.environment}/${config.repositoryName}.yaml`

  const fileContent = await getRepositoryFile({
    repositoryUrl: options.repositoryUrl,
    ref: options.repositoryRef || "main",
    file: remoteConfigPath,
  })

  if (fileContent === false) {
    return
  }

  const resourcesConfig = yaml.load(fileContent)

  for (const manifest of manifests) {
    const kind = manifest.kind.toLowerCase()
    const apiGroup = manifest.apiVersion.split("/")[0].toLowerCase()
    const key = `${kind}.${apiGroup}`

    const { name } = manifest.metadata

    switch (key) {
      case "cluster.postgresql.cnpg.io": {
        const mergeResources =
          resourcesConfig[key]?.[name]?.resources ||
          resourcesConfig[kind]?.[name]?.resources ||
          {}
        manifest.spec.resources = deepmerge(
          manifest.spec.resources || {},
          mergeResources
        )
        break
      }
      case "deployment.apps":
      case "statefulset.apps": {
        const mergeContainersResources =
          resourcesConfig[key]?.[name]?.containers ||
          resourcesConfig[kind]?.[name]?.containers

        if (mergeContainersResources) {
          for (const container of manifest.spec.template.spec.containers) {
            const containerResources = mergeContainersResources[container.name]
            if (containerResources) {
              container.resources = deepmerge(
                container.resources || {},
                containerResources
              )
            }
          }
        }
        break
      }
      default: {
        // Handle other kinds if necessary
        break
      }
    }
  }
}
