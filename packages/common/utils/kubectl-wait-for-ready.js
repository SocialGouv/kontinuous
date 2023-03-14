const kubectlRetry = require("./kubectl-retry")
const getLogger = require("./get-logger")
const waitAppear = require("./wait-appear")

module.exports = async (options) => {
  const {
    kind,
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
    /*
    const jsonStatusConditions = await kubectl(
      `${
        namespace ? `-n ${namespace}` : ""
      } get -l ${selector} -o jsonpath={.status.conditions}`,
      {
        abortSignal,
        kubeconfig,
        kubeconfigContext: kubecontext,
        surviveOnBrokenCluster,
        logger,
      }
      )
      const statusConditions = JSON.parse(jsonStatusConditions)
    const status = statusConditions.reduce((acc, condition)=>{
      acc[condition.type] = condition.status
      return acc
    }, {})
    */
    try {
      await kubectl(
        `${
          namespace ? `-n ${namespace}` : ""
        } wait --for=condition=Ready ${kind} -l ${selector}`,
        {
          abortSignal,
          kubeconfig,
          kubeconfigContext: kubecontext,
          surviveOnBrokenCluster,
          logger,
        }
      )
      return { success: true }
    } catch (error) {
      if (error.message.includes("not found")) {
        return
      }
      return { success: false, error }
    }
  })
}
