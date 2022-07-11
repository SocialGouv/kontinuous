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

      const runJob = await eventHandlers[eventName]({
        ref,
        after,
        repositoryUrl,
        commits,
        defaultBranch,
      })
      if (!runJob) {
        return res.status(204).json({ message: "no-op" })
      }
      runJob()
      return res.status(202).json({ message: "accepted" })
    },
  ]
}
