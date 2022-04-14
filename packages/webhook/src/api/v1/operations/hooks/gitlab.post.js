const { reqCtx } = require("@modjo-plugins/express/ctx")

const isVersionTag = require("~common/utils/is-version-tag")

const getEventName = (req) => {
  const { event_name: eventName } = req.body
  if (
    Object.keys(req.body).includes("checkout_sha") &&
    req.body.checkout_sha === null &&
    req.body.after === "0000000000000000000000000000000000000000"
  ) {
    // see https://gitlab.com/gitlab-org/gitlab/-/issues/25305
    return "deleted "
  }
  if (eventName === "tag_push") {
    const { body } = req
    const { ref } = body
    const gitBranch = ref.replace("refs/heads/", "").replace("refs/tags/", "")
    if (isVersionTag(gitBranch)) {
      return "created"
    }
    return null
  }
  return "pushed"
}

module.exports = function ({ services: { pushed, created, deleted } }) {
  const eventHandlers = { pushed, created, deleted }
  return [
    async (req, res) => {
      const eventName = getEventName(req)
      if (!eventName || !eventHandlers[eventName]) {
        return res.status(204).json({ message: "no-op" })
      }

      const { body } = req
      const { ref } = body
      const { ssh_url: repositoryUrl } = body.project

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
