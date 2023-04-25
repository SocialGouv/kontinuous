const { ctx } = require("@modjo/core")

const rolloutStatus = require("~/k8s/utils/rollout-status")

module.exports = function ({ services: { getRootKubeconfig } }) {
  const logger = ctx.require("logger")

  return [
    async (req, res) => {
      const { cluster, namespace } = req.query

      const kubeconfig = getRootKubeconfig(cluster)

      logger.debug("--> getting rollout status:")
      const status = await rolloutStatus({
        kubeconfig,
        namespace,
      })
      return res.status(200).json({ status })
    },
  ]
}
