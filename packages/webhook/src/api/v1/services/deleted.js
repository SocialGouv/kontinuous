const { ctx } = require("@modjo-plugins/core")

module.exports = function () {
  const logger = ctx.require("logger")
  return ({ ref, repository, repositoryUrl }) => {
    logger.debug({ event: "deleted", ref, repository, repositoryUrl })
  }
}
