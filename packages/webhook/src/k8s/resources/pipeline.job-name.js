const slug = require("~common/utils/slug")

module.exports = ({ env, eventName, repositoryName, gitBranch, chart }) =>
  slug([
    "pipeline",
    eventName,
    env,
    repositoryName,
    [gitBranch, 30],
    ...(chart ? [chart] : []),
  ])
