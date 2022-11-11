const { ctx } = require("@modjo-plugins/core")

module.exports = ({ services }) => {
  const config = ctx.require("config")
  return async (cluster) => {
    let kubeconfig
    kubeconfig = await services.getKubeconfig(cluster)
    if (!kubeconfig && config.project.ciNamespace.allowAll) {
      kubeconfig = services.getRootKubeconfig(cluster)
    }
    return kubeconfig
  }
}
