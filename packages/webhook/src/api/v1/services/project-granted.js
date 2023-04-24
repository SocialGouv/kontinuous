const { reqCtx } = require("@modjo/express/ctx")
const { ctx } = require("@modjo/core")

module.exports = ({ services: { getProject } }) => {
  const config = ctx.require("config")
  const { ciNamespace } = config.project
  const { template } = ciNamespace

  return (req) => {
    const project = getProject(req)
    reqCtx.set("project", project)

    // reqCtx.set("jobNamespace", `${project}-ci`)
    reqCtx.set("jobNamespace", template.replaceAll("${project}", project))
  }
}
