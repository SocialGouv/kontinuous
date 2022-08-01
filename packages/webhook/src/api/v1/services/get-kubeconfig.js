const { ctx } = require("@modjo-plugins/core")
const { reqCtx } = require("@modjo-plugins/express/ctx")

module.exports = () => (cluster) => {
  const logger = ctx.require("logger")
  const kubeconfigs = ctx.require("config.project.secrets.kubeconfigs")
  const project = reqCtx.require("project")
  const projectKubeconfigs = kubeconfigs[project]
  if (!projectKubeconfigs) {
    const msg = `project not found: "${project}"`
    logger.error({ project, cluster }, msg)
    throw new Error(msg)
  }
  const kubeconfig = projectKubeconfigs[cluster]
  if (!kubeconfig) {
    const msg = `kubeconfig not found for cluster: "${cluster}"`
    logger.error({ project, cluster }, msg)
    throw new Error(msg)
  }
  return kubeconfig
}
