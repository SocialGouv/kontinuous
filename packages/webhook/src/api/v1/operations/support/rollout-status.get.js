const rolloutStatus = require("~common/utils/rollout-status")
const { ctx } = require("@modjo-plugins/core")

module.exports = function ({ services: { getRootKubeconfig } }) {
  const logger = ctx.require("logger")

  return [
    async (req, res) => {
      const { cluster, namespace } = req.query

      const kubeconfig = getRootKubeconfig(cluster)
      if (kubeconfig === false) {
        return res
          .status(404)
          .json({ message: "kubeconfig for cluster not found" })
      }

      logger.debug("--> getting rollout status:")
      const status = await rolloutStatus({
        kubeconfig,
        namespace,
      })
      return res.status(200).json({ status })
    },
  ]
}
