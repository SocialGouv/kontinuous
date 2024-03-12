module.exports = async (values, options, { config, logger, kubectl }) => {
  const { kubeconfig, kubeconfigContext } = config

  const {
    surviveOnBrokenCluster = false,
    buildkitServiceNamespace = "buildkit-service",
  } = options
  let { podCount } = options
  if (!podCount) {
    logger.info(
      `getting buildkit statefulset pod count in "${buildkitServiceNamespace}"`
    )
    try {
      podCount = await kubectl(
        `${
          kubeconfigContext ? `--context ${kubeconfigContext}` : ""
        } get -n ${buildkitServiceNamespace} sts buildkit-service -o=jsonpath='{.status.replicas}'`,
        {
          kubeconfig,
          logInfo: false,
          logError: false,
          surviveOnBrokenCluster,
        }
      )
    } catch (error) {
      logger.error(
        { error },
        `unable to retrieve buildkit statefulset pod count in "${buildkitServiceNamespace}`
      )
      throw error
    }
  }
  if (podCount) {
    values.global.buildkitPodCount = podCount
  }
}
