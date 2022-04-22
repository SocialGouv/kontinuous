module.exports = (env) => {
  if (env === "prod") {
    return process.KUBECONTEXT_PROD_NAME || "prod"
  }
  return process.KUBECONTEXT_DEV_NAME || "dev"
}
