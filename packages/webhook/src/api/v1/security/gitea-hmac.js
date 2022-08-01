module.exports =
  ({ services: { verifyHmac, getProjectTokens, projectGranted } }) =>
  async (req, _scopes, _schema) => {
    const signature = req.get("X-Gitea-Signature")
    if (!signature) {
      return false
    }
    const tokens = getProjectTokens(req)
    if (tokens.length === 0) {
      return false
    }

    let granted
    for (const token of tokens) {
      granted = await verifyHmac({
        signature,
        body: req.rawBody,
        secret: token,
      })
      if (granted) {
        break
      }
    }

    if (granted) {
      projectGranted(req)
    }

    return granted
  }
