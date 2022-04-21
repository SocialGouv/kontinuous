module.exports = (options = {}) => {
  const port = process.env.KUBEWEBHOOK_EXPOSED_PORT || options.port || "3000"
  const host = process.env.KUBEWEBHOOK_EXPOSED_HOST || options.host || "0.0.0.0"
  const https =
    process.env.KUBEWEBHOOK_EXPOSED_HTTPS &&
    process.env.KUBEWEBHOOK_EXPOSED_HTTPS !== "false"

  let uri = "http"
  if (https) {
    uri += "s"
  }
  uri += `://${host}`
  const defaultPort = https ? "443" : "80"
  if (port && port.toString() !== defaultPort) {
    uri += `:${port}`
  }
  return uri
}
