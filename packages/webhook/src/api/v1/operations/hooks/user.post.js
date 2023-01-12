// const ctx = require("~common/ctx")

module.exports = function ({ services: { pushed, deleted } }) {
  const eventHandlers = { pushed, deleted }

  // const sentry = ctx.get("sentry")

  return [
    async (req, res) => {
      const { body, query } = req

      const { event: eventName, env } = query
      if (!eventName || !eventHandlers[eventName]) {
        return res.status(204).json({ message: "no-op" })
      }

      const { ref, repositoryUrl, commit } = body
      const {
        mountKubeconfig,
        serviceAccountName,
        mountSecrets,
        kontinuousVersion,
        chart,
        ignoreProjectTemplates,
      } = query

      const runJob = await eventHandlers[eventName]({
        ref,
        after: commit,
        repositoryUrl,
        env,
        kontinuousVersion,
        mountKubeconfig,
        serviceAccountName,
        mountSecrets,
        chart,
        ignoreProjectTemplates,
      })

      if (!runJob) {
        return res.status(204).json({ message: "no-op" })
      }
      runJob()

      return res.status(202).json({ message: "accepted" })
    },
  ]
}
