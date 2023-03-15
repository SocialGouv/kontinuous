const rolloutStatusWatch = require("./rollout-status-watch")
const kubectlWaitForReady = require("./kubectl-wait-for-ready")

const rolloutStatusHandledKinds = require("./rollout-status-handled-kinds")

module.exports = async (options) => {
  if (rolloutStatusHandledKinds.includes(options.kind)) {
    return rolloutStatusWatch({ ...options, kindFilter: options.kind })
  }
  return kubectlWaitForReady(options)
}
