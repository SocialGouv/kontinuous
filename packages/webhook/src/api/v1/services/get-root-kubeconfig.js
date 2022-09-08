const { ctx } = require("@modjo-plugins/core")

module.exports = () => (cluster) => {
  const logger = ctx.require("logger")
  const rootKubeconfigs = ctx.require("config.project.secrets.rootKubeconfigs")
  const kubeconfig = rootKubeconfigs[cluster]
  if (!kubeconfig) {
    const msg = `root kubeconfig not found for cluster: "${cluster}"`
    logger.error({ cluster }, msg)
    throw new Error(msg)
  }
  return kubeconfig
}
