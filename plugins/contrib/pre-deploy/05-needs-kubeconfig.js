module.exports = async (manifests, _options, context) => {
  const { utils, config, logger } = context
  const { kindIsRunnable } = utils
  const hasWaitNeeds = !!manifests.find(
    (m) =>
      kindIsRunnable(m.kind) &&
      m.spec.template.spec.initContainers?.find(
        (container) => container.name === "kontinuous-wait-needs"
      )
  )
  if (!hasWaitNeeds) {
    return
  }

  const { kubectlRetry } = utils
  const { kubeconfig, kubeconfigContext, ciNamespace } = config

  const namespaces = manifests
    .filter((manifest) => manifest.kind === "Namespace")
    .map((manifest) => manifest.metadata.name)

  const secretName = "kubeconfig"
  const kubeconfigSecretJSON = await kubectlRetry(
    `
    get -n ${ciNamespace} secret ${secretName} -ojson
  `,
    { kubeconfig, kubeconfigContext, logInfo: false }
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
        await kubectlRetry(`apply -n ${namespace} -f -`, {
          kubeconfig,
          kubeconfigContext,
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
