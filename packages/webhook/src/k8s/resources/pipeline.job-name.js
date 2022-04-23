const slug = require("~common/utils/slug")

module.exports = ({ eventName, repositoryName, gitBranch }) =>
  slug(["pipeline", eventName, repositoryName, [gitBranch, 30]])
