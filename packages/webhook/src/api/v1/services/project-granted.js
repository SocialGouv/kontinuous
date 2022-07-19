const { reqCtx } = require("@modjo-plugins/express/ctx")

module.exports =
  ({ services: { getProject } }) =>
  (req) => {
    const project = getProject(req)
    reqCtx.set("project", project)
  }
