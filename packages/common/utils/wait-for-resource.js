const rolloutStatusWatch = require("./rollout-status-watch")
const kubectlWaitForReady = require("./kubectl-wait-for-ready")

const rolloutStatusHandledKinds = require("./rollout-status-handled-kinds")

module.exports = async ({ kind, ...options }) => {
  if (rolloutStatusHandledKinds.includes(kind)) {
    return rolloutStatusWatch({ ...options, kindFilter: kind })
  }
  return kubectlWaitForReady(options)
}
