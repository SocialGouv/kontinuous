module.exports = async (manifests, options, context) => {
  const { utils, config, logger, kubectl } = context
  const { kindIsRunnable } = utils
  const hasWaitNeeds = !!manifests.find(
    (m) =>
      kindIsRunnable(m) &&
      m.spec.template.spec.initContainers?.find(
        (container) => container.name === "kontinuous-wait-needs"
      )
  )
  if (!hasWaitNeeds) {
    return
  }

  const { kubeconfig, kubeconfigContext, ciNamespace } = config

  const { surviveOnBrokenCluster = false } = options

  const namespaces = manifests
    .filter((manifest) => manifest.kind === "Namespace")
    .map((manifest) => manifest.metadata.name)

  const kubectlOptions = {
    kubeconfig,
    kubeconfigContext,
    surviveOnBrokenCluster,
  }

  const secretName = "kubeconfig"
  const kubeconfigSecretJSON = await kubectl(
    `get -n ${ciNamespace} secret ${secretName} -ojson`,
    { ...kubectlOptions, logInfo: false }
  )
  const kubeconfigSecret = JSON.parse(kubeconfigSecretJSON)
  const { metadata } = kubeconfigSecret
  delete metadata.namespace
  delete metadata.resourceVersion
  delete metadata.uid
  delete metadata.creationTimestamp

  await Promise.all(
    namespaces.map(async (namespace) => {
      try {
        await kubectl(`apply -n ${namespace} -f -`, {
          ...kubectlOptions,
          stdin: JSON.stringify(kubeconfigSecret),
        })
        logger.debug(
          { namespace, ciNamespace, secretName },
          "kubeconfig secret copied"
        )
      } catch (error) {
        logger.error({ error }, "unable to copy kubeconfig secret")
      }
    })
  )
}
