const retry = require("async-retry")

module.exports = async (
  manifests,
  _options,
  { utils, config, logger, kubectl }
) => {
  const { kubeEnsureNamespace } = utils
  const { kubeconfig, kubeconfigContext, surviveOnBrokenCluster } = config

  const rancherNamespacesManifests = manifests.filter(
    (manifest) =>
      manifest.kind === "Namespace" &&
      manifest.metadata?.annotations?.["field.cattle.io/projectId"]
  )

  if (rancherNamespacesManifests.length === 0) {
    return
  }

  const namespaces = rancherNamespacesManifests.map(
    (manifest) => manifest.metadata.name
  )

  logger.debug({ namespaces }, "🟦 ensure rancher namespaces are availables")

  await Promise.all(
    rancherNamespacesManifests.map((manifest) =>
      kubeEnsureNamespace({ kubeconfig, kubeconfigContext, manifest, kubectl })
    )
  )

  await Promise.all(
    rancherNamespacesManifests.map((manifest) =>
      kubeEnsureNamespace({ kubeconfig, kubeconfigContext, manifest, kubectl })
    )
  )

  const ensureRancherNamespaceReady = async (namespace) => {
    const retryOptions = {
      retries: 10,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 60000,
      randomize: true,
    }
    await retry(async (_bail) => {
      const json = await kubectl(`get ns ${namespace} -o json`, {
        kubeconfig,
        kubeconfigContext,
        logInfo: false,
        ignoreErrors: ["NotFound", "Forbidden"],
        logger,
        surviveOnBrokenCluster,
        retryOptions,
      })
      const data = JSON.parse(json)
      const rancherStatusJSON = data?.metadata.annotations?.["cattle.io/status"]
      if (rancherStatusJSON) {
        const rancherStatus = JSON.parse(rancherStatusJSON)
        const InitialRolesPopulated = rancherStatus.Conditions.find(
          ({ Type }) => Type === "InitialRolesPopulated"
        )
        if (InitialRolesPopulated) {
          if (InitialRolesPopulated.Status === "True") {
            return true
          }
        }
      }
      throw Error(`♉ rancher namespace "${namespace}" is not ready`)
    }, retryOptions)
  }

  await Promise.all(namespaces.map(ensureRancherNamespaceReady))

  logger.debug({ namespaces }, "namespaces ready")
}
