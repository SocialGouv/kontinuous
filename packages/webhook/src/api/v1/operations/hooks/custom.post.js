const { reqCtx } = require("@modjo-plugins/express/ctx")

module.exports = function ({ services: { custom } }) {
  return [
    async (req, res) => {
      const { env } = req.body
      const [manifests] = req.files

      try {
        await custom({ env, manifests })
      } catch (err) {
        const logger = reqCtx.require("logger")
        logger.error(err)
        return res.status(500).json({ message: "error" })
      }

      return res.status(202).json({ message: "accepted" })
    },
  ]
}
