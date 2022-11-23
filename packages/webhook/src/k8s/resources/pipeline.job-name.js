const slug = require("~common/utils/slug")

module.exports = ({ eventName, repositoryName, gitBranch, chart }) =>
  slug([
    "pipeline",
    eventName,
    repositoryName,
    [gitBranch, 30],
    ...(chart ? [chart] : []),
  ])
