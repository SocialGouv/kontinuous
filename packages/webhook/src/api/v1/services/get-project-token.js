const { ctx } = require("@modjo-plugins/core")

module.exports =
  ({ services }) =>
  (req) => {
    const project = services.getProject(req)
    const tokens = ctx.require("config.project.secrets.tokens")
    const supertoken = ctx.require("config.project.secrets.supertoken")
    return [...(tokens[project] || []), supertoken]
  }
