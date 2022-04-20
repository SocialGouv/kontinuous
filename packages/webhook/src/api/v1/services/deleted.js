const { ctx } = require("@modjo-plugins/core")

module.exports = function () {
  const logger = ctx.require("logger")
  return ({ ref, after, repository, repositoryUrl }) => {
    logger.debug({ event: "deleted", ref, after, repository, repositoryUrl })
    logger.info("not yet implemented")
  }
}
