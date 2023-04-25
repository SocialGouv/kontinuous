const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

module.exports = () => (cluster) => {
  const kubeconfigs = ctx.require("config.project.secrets.kubeconfigs")
  const project = reqCtx.require("project")
  const projectKubeconfigs = kubeconfigs[project]
  if (!projectKubeconfigs) {
    return
  }
  const kubeconfig = projectKubeconfigs[cluster]
  return kubeconfig
}
