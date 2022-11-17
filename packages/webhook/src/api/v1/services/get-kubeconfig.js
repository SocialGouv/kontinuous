const { ctx } = require("@modjo-plugins/core")
const { reqCtx } = require("@modjo-plugins/express/ctx")

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
