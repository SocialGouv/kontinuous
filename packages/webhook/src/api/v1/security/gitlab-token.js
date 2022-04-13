module.exports = () => async (req, _scopes, _schema) => {
  const token = req.headers["X-Gitlab-Token"]
  return token === process.env.KUBEWEBHOOK_TOKEN
}
