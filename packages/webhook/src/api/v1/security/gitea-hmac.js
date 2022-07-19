module.exports =
  ({ services: { verifyHmac, getProjectToken, projectGranted } }) =>
  async (req, _scopes, _schema) => {
    const signature = req.get("X-Gitea-Signature")
    if (!signature) {
      return false
    }
    const token = getProjectToken(req)
    if (!token) {
      return false
    }

    const granted = await verifyHmac({
      signature,
      body: req.rawBody,
      secret: token,
    })

    if (granted) {
      projectGranted(req)
    }

    return granted
  }
