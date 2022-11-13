module.exports =
  ({ services: { getProjectTokens, projectGranted } }) =>
  async (req, _scopes, _schema) => {
    const bearerToken = req.headers.authorization
    if (!bearerToken) {
      return false
    }

    const splits = bearerToken.split(" ")
    if (splits[0] !== "Bearer") {
      return false
    }

    const extractedToken = splits[1].trim()

    const tokens = getProjectTokens(req)
    if (tokens.length === 0) {
      return false
    }

    let granted
    for (const token of tokens) {
      granted = extractedToken === token
      if (granted) {
        break
      }
    }

    if (granted) {
      projectGranted(req)
    }

    return granted
  }
