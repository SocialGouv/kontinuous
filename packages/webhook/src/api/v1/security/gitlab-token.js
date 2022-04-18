module.exports = () => async (req, _scopes, _schema) => {
  const token = req.get("X-Gitlab-Token")
  return token === process.env.KUBEWEBHOOK_TOKEN
}
