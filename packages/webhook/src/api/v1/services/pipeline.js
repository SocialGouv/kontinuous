const { ctx } = require("@modjo-plugins/core")

const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")

const slug = require("~common/utils/slug")
const cleanGitRef = require("~common/utils/clean-git-ref")
const jobRun = require("~/k8s/command/job-run")
const pipelineJob = require("~/k8s/resources/pipeline.job")

module.exports = () => {
  const logger = ctx.require("logger")
  const { jobNamespace } = ctx.require("config.project")
  return async ({
    eventName,
    kubecontext,
    ref,
    repositoryUrl,
    args,
    checkout,
  }) => {
    const repository = repositoryFromGitUrl(repositoryUrl)
    logger.debug({
      eventName,
      ref,
      repository,
      repositoryUrl,
    })
    const repositoryName = repository.split("/").pop()
    const gitBranch = cleanGitRef(ref)
    const jobName = slug([
      "pipeline",
      eventName,
      repositoryName,
      [gitBranch, 30],
    ])
    const manifest = pipelineJob({
      namespace: jobNamespace,
      name: jobName,
      args,
      checkout,
      repositoryUrl,
      ref,
    })
    try {
      await jobRun(manifest, kubecontext)
      logger.debug(
        `pipeline job "${jobName}" launched in namespace "${jobNamespace}"`
      )
    } catch (err) {
      logger.error(
        `failed to launch pipeline job "${jobName}" in namespace "${jobNamespace}"`
      )
      logger.error(err)
    }
  }
}
