const { ctx } = require("@modjo-plugins/core")
const repositoryFromGitUrl = require("kube-workflow-common/utils/repository-from-git-url")

module.exports = function () {
  const logger = ctx.require("logger")
  return ({ ref, repositoryUrl }) => {
    const repository = repositoryFromGitUrl(repositoryUrl)
    logger.info({
      event: "pushed",
      ref,
      repository,
      repositoryUrl,
    })
  }
}
