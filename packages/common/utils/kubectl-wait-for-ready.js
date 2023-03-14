const kubectlRetry = require("./kubectl-retry")
const getLogger = require("./get-logger")
const waitAppear = require("./wait-appear")

const defaultWaitRulesForKind = require("./wait-rules-for-kind")
const defaultWaitRulesForKindDefault = require("./wait-rules-for-kind-default")

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
    waitRulesForKind = defaultWaitRulesForKind,
  } = options

  const kindRule =
    waitRulesForKind[kind] ||
    waitRulesForKind._Default ||
    defaultWaitRulesForKindDefault

  return waitAppear(options, async () => {
    try {
      const json = await kubectl(
        `${
          namespace ? `-n ${namespace}` : ""
        } get ${kind} -l ${selector} -o json`,
        {
          abortSignal,
          kubeconfig,
          kubeconfigContext: kubecontext,
          surviveOnBrokenCluster,
          logger,
          logInfo: false,
        }
      )
      const manifests = JSON.parse(json)
      const ok = manifests.items.every(kindRule)

      if (ok) {
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
