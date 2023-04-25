const { ctx } = require("@modjo/core")

module.exports = () => (cluster) => {
  const rootKubeconfigs = ctx.require("config.project.secrets.rootKubeconfigs")
  const kubeconfig = rootKubeconfigs[cluster]
  return kubeconfig
}
