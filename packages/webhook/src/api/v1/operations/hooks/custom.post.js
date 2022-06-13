const { reqCtx } = require("@modjo-plugins/express/ctx")

module.exports = function ({ services: { custom } }) {
  return [
    async (req, res) => {
      const { env, hash, repositoryUrl } = req.query
      const [manifestsFile] = req.files

      const manifests = manifestsFile.buffer.toString("utf-8")

      try {
        await custom({ env, hash, repositoryUrl, manifests })
      } catch (err) {
        const logger = reqCtx.require("logger")
        logger.error(err)
        return res.status(500).json({ message: "error" })
      }

      return res.status(202).json({ message: "accepted" })
    },
  ]
}
