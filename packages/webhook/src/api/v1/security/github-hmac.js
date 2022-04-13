module.exports =
  ({ services: { verifyHmac } }) =>
  async (req, _scopes, _schema) => {
    const signature = req.headers["X-Hub-Signature-256"]
    if (!signature) {
      return false
    }
    return verifyHmac({
      signature,
      body: req.rawBody,
      secret: process.env.KUBEWEBHOOK_TOKEN,
    })
  }
