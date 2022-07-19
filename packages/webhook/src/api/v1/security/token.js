module.exports =
  ({ services: { getProjectToken, projectGranted } }) =>
  async (req, _scopes, _schema) => {
    const { token: queryToken } = req.query
    if (!queryToken) {
      return false
    }

    const token = getProjectToken(req)

    if (!token) {
      return false
    }

    const granted = queryToken === token

    if (granted) {
      projectGranted(req)
    }

    return granted
  }
