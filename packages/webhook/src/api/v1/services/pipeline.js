const { ctx } = require("@modjo-plugins/core")

const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")

const cleanGitRef = require("~common/utils/clean-git-ref")
const jobRun = require("~/k8s/command/job-run")
const pipelineJob = require("~/k8s/resources/pipeline.job")
const pipelineJobName = require("~/k8s/resources/pipeline.job-name")

module.exports = ({ services }) => {
  const logger = ctx.require("logger")
  const { jobNamespace } = ctx.require("config.project")
  return async ({
    eventName,
    kubecontext,
    ref,
    after,
    repositoryUrl,
    args,
    checkout,
  }) => {
    const repository = repositoryFromGitUrl(repositoryUrl)
    const repositoryName = repository.split("/").pop()
    const gitBranch = cleanGitRef(ref)
    const jobName = pipelineJobName({
      eventName,
      repositoryName,
      gitBranch,
    })
    logger.info(
      `event ${eventName} triggering workflow on ${repository}#${ref} ${after}`
    )
    const manifest = pipelineJob({
      namespace: jobNamespace,
      name: jobName,
      args,
      checkout,
      repositoryUrl,
      gitBranch,
      gitCommit: after,
      uploadUrl: services.getUploadUrl({
        repositoryUrl,
        gitBranch,
        gitCommit: after,
      }),
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
