const { reqCtx } = require("@modjo-plugins/express/ctx")

module.exports = function ({ services: { pushed, deleted } }) {
  const eventHandlers = { pushed, deleted }

  return [
    async (req, res) => {
      const { body } = req

      const eventName = req.query.event
      if (!eventName || !eventHandlers[eventName]) {
        return res.status(204).json({ message: "no-op" })
      }

      const { ref, repositoryUrl, commit } = body

      try {
        const trigger = await eventHandlers[eventName]({
          ref,
          repositoryUrl,
          after: commit,
        })
        if (!trigger) {
          return res.status(204).json({ message: "no-op" })
        }
      } catch (err) {
        const logger = reqCtx.require("logger")
        logger.error(err)
        return res.status(500).json({ message: "error" })
      }

      return res.status(202).json({ message: "accepted" })
    },
  ]
}
