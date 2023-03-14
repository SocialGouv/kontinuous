const kubectlRetry = require("./kubectl-retry")
const getLogger = require("./get-logger")
const waitAppear = require("./wait-appear")

module.exports = async (options) => {
  const {
    // kind,
    namespace,
    selector,
    kubeconfig,
    kubecontext,
    abortSignal,
    surviveOnBrokenCluster = false,
    logger = getLogger(),
    kubectl = kubectlRetry,
  } = options
  return waitAppear(options, async () => {
    try {
      // await kubectl(
      //   `${
      //     namespace ? `-n ${namespace}` : ""
      //   } wait --for=condition=Ready ${kind} -l ${selector}`,
      //   {
      //     abortSignal,
      //     kubeconfig,
      //     kubeconfigContext: kubecontext,
      //     surviveOnBrokenCluster,
      //     logger,
      //   }
      // )
      const json = await kubectl(
        `${namespace ? `-n ${namespace}` : ""} get -l ${selector} -o json`,
        {
          abortSignal,
          kubeconfig,
          kubeconfigContext: kubecontext,
          surviveOnBrokenCluster,
          logger,
        }
      )
      const manifests = JSON.parse(json)
      const conditions = manifests.items.reduce((acc, item) => {
        const statusConditions = item.status.conditions
        const status = statusConditions.reduce((o, condition) => {
          o[condition.type] = condition.status
          return o
        }, {})
        acc.push(status)
        return acc
      }, [])
      if (conditions.every((condition) => condition.Ready === "True")) {
        return { success: true }
      }
    } catch (error) {
      if (error.message.includes("not found")) {
        return
      }
      return { success: false, error }
    }
  })
}
