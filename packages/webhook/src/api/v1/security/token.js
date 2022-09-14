module.exports =
  ({ services: { getProjectTokens, projectGranted } }) =>
  async (req, _scopes, _schema) => {
    let { token: queryToken } = req.query
    if (!queryToken) {
      queryToken = req.headers.authorization
    }

    if (!queryToken) {
      return false
    }

    const tokens = getProjectTokens(req)
    if (tokens.length === 0) {
      return false
    }

    let granted
    for (const token of tokens) {
      granted = queryToken === token
      if (granted) {
        break
      }
    }

    if (granted) {
      projectGranted(req)
    }

    return granted
  }
