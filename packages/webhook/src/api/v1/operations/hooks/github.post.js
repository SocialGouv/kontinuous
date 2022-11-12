module.exports = function ({ services: { pushed, deleted } }) {
  const eventHandlers = { pushed, deleted }

  return [
    async (req, res) => {
      const { body, query } = req

      let eventName = query.event

      // deprecated
      if (eventName === "created") {
        eventName = "pushed"
      }

      const { ref, after } = body

      if (
        eventName === "pushed" &&
        (!after || after === "0000000000000000000000000000000000000000")
      ) {
        return res.status(204).json({ message: "no-op" })
      }

      if (!eventName || !eventHandlers[eventName]) {
        return res.status(204).json({ message: "no-op" })
      }

      const { clone_url: repositoryUrl, commits } = body.repository

      const { kontinuousVersion, mountKubeconfig } = query

      const runJob = await eventHandlers[eventName]({
        ref,
        after,
        repositoryUrl,
        commits,
        kontinuousVersion,
        mountKubeconfig,
      })
      if (!runJob) {
        return res.status(204).json({ message: "no-op" })
      }
      runJob()
      return res.status(202).json({ message: "accepted" })
    },
  ]
}
