module.exports = ({ services: { verifyHmac } }) => {
  return async (req, _scopes, _schema) => {
    const signature = req.headers["X-Hub-Signature-256"]
    return verifyHmac(signature, req.body)
  }
}
