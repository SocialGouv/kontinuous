module.exports = function ({ services: { pushed, deleted } }) {
  const eventHandlers = { pushed, deleted }

  return [
    async (req, res) => {
      const { body } = req

      const { event: eventName, env } = req.query
      if (!eventName || !eventHandlers[eventName]) {
        return res.status(204).json({ message: "no-op" })
      }

      const { ref, repositoryUrl, commit } = body

      const runJob = await eventHandlers[eventName]({
        ref,
        after: commit,
        repositoryUrl,
        env,
      })
      if (!runJob) {
        return res.status(204).json({ message: "no-op" })
      }
      runJob()

      return res.status(202).json({ message: "accepted" })
    },
  ]
}
