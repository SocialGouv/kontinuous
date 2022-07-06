const { reqCtx } = require("@modjo-plugins/express/ctx")

module.exports = function ({ services: { pushed, deleted } }) {
  const eventHandlers = { pushed, deleted }

  return [
    async (req, res) => {
      const { body } = req

      let eventName = req.query.event

      // deprecated
      if (eventName === "created") {
        eventName = "pushed"
      }

      if (!eventName || !eventHandlers[eventName]) {
        return res.status(204).json({ message: "no-op" })
      }

      const { ref, after } = body

      const {
        clone_url: repositoryUrl,
        commits,
        default_branch: defaultBranch,
      } = body.repository

      try {
        const trigger = await eventHandlers[eventName]({
          ref,
          after,
          repositoryUrl,
          commits,
          defaultBranch,
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
