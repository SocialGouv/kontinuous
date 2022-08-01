module.exports =
  ({ services: { getProjectTokens, projectGranted } }) =>
  async (req, _scopes, _schema) => {
    const gitlabToken = req.get("X-Gitlab-Token")

    const tokens = getProjectTokens(req)
    if (tokens.length === 0) {
      return false
    }

    let granted
    for (const token of tokens) {
      granted = gitlabToken === token
      if (granted) {
        break
      }
    }

    if (granted) {
      projectGranted(req)
    }

    return granted
  }
