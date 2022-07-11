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

      const { ref, after } = body

      if (eventName === "pushed" && !after) {
        return res.status(204).json({ message: "no-op" })
      }

      if (!eventName || !eventHandlers[eventName]) {
        return res.status(204).json({ message: "no-op" })
      }

      const { clone_url: repositoryUrl, commits } = body.repository

      const runJob = await eventHandlers[eventName]({
        ref,
        after,
        repositoryUrl,
        commits,
      })
      if (!runJob) {
        return res.status(204).json({ message: "no-op" })
      }
      runJob()
      return res.status(202).json({ message: "accepted" })
    },
  ]
}
