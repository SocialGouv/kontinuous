module.exports = () => async (req, _scopes, _schema) => {
  const { token } = req.query
  return token === process.env.KUBEWEBHOOK_TOKEN
}
