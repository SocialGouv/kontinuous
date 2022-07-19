const { ctx } = require("@modjo-plugins/core")

module.exports =
  ({ services: getProject }) =>
  (req) => {
    const project = getProject(req)
    const tokens = ctx.require("config.project.secrets.tokens")
    const supertoken = ctx.require("config.project.secrets.supertoken")
    return [...(tokens[project] || []), supertoken]
  }
