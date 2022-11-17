const { reqCtx } = require("@modjo-plugins/express/ctx")

const getEventName = (req) => {
  if (
    Object.keys(req.body).includes("checkout_sha") &&
    req.body.checkout_sha === null &&
    req.body.after === "0000000000000000000000000000000000000000"
  ) {
    // see https://gitlab.com/gitlab-org/gitlab/-/issues/25305
    return "deleted "
  }
  // const { event_name: eventName } = req.body
  // if (eventName === "tag_push") {
  // }
  return "pushed"
}

module.exports = function ({ services: { pushed, deleted } }) {
  const eventHandlers = { pushed, deleted }
  return [
    async (req, res) => {
      const eventName = getEventName(req)
      if (!eventName || !eventHandlers[eventName]) {
        return res.status(204).json({ message: "no-op" })
      }

      const { body, query } = req
      const { ref, after, commits } = body
      const { git_http_url: repositoryUrl } = body.project

      const { mountKubeconfig, kontinuousVersion } = query
      try {
        await eventHandlers[eventName]({
          ref,
          after,
          repositoryUrl,
          commits,
          mountKubeconfig,
          kontinuousVersion,
        })
      } catch (err) {
        const logger = reqCtx.require("logger")
        logger.error(err)
        return res.status(500).json({ message: "error" })
      }

      return res.status(202).json({ message: "accepted" })
    },
  ]
}
