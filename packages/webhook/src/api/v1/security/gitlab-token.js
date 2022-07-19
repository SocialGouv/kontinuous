module.exports =
  ({ services: { getProjectToken, projectGranted } }) =>
  async (req, _scopes, _schema) => {
    const gitlabToken = req.get("X-Gitlab-Token")
    const token = getProjectToken(req)
    if (!token) {
      return false
    }

    const granted = gitlabToken === token

    if (granted) {
      projectGranted(req)
    }

    return granted
  }
