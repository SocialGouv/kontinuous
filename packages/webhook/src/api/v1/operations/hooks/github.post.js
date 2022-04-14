const { reqCtx } = require("@modjo-plugins/express/ctx")

module.exports = function ({ services: { pushed, created, deleted } }) {
  const eventHandlers = { pushed, created, deleted }

  return [
    async (req, res) => {
      const { body } = req

      const eventName = req.query.event
      if (!eventName || !eventHandlers[eventName]) {
        return res.status(204).json({ message: "no-op" })
      }

      const { ref } = body

      const { clone_url: repositoryUrl } = body.repository

      try {
        await eventHandlers[eventName]({ ref, repositoryUrl })
      } catch (err) {
        const logger = reqCtx.require("logger")
        logger.error(err)
        return res.status(500).json({ message: "error" })
      }

      return res.status(202).json({ message: "accepted" })
    },
  ]
}
