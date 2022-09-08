const rolloutStatus = require("~common/utils/rollout-status")
const { ctx } = require("@modjo-plugins/core")

module.exports = function ({ services: { getRootKubeconfig } }) {
  const logger = ctx.require("logger")

  return [
    async (req, res) => {
      const { cluster, namespace } = req.query

      const kubeconfig = getRootKubeconfig(cluster)
      logger.debug("--> getting rollout status:")
      try {
        const status = await rolloutStatus({
          kubeconfig,
          namespace,
        })
        return res.status(200).json({ status })
      } catch (err) {
        return res.status(500).json({ error: err.message })
      }
    },
  ]
}
