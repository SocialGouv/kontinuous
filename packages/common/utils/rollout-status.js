const rolloutStatusExec = require("./rollout-status-exec")

module.exports = async ({ kubeconfig, kubecontext, namespace, selector }) => {
  const { promise } = rolloutStatusExec({
    kubeconfig,
    kubecontext,
    namespace,
    selector,
  })
  return promise
}
