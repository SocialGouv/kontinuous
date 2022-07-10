const { ctx } = require("@modjo-plugins/core")

const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")

const cleanGitRef = require("~common/utils/clean-git-ref")
const jobRun = require("~/k8s/command/job-run")
const pipelineJob = require("~/k8s/resources/pipeline.job")
const pipelineJobName = require("~/k8s/resources/pipeline.job-name")
const refKubecontext = require("~/git/ref-kubecontext")

module.exports = () => {
  const logger = ctx.require("logger")
  const { jobNamespace } = ctx.require("config.project")
  return async ({
    eventName,
    env,
    kubecontext,
    ref,
    after,
    defaultBranch,
    repositoryUrl,
    args,
    checkout,
    initContainers,
    commits,
  }) => {
    const repository = repositoryFromGitUrl(repositoryUrl)
    const repositoryName = repository.split("/").pop()
    const gitBranch = cleanGitRef(ref)
    const gitCommit = after || ""

    if (!kubecontext) {
      kubecontext = await refKubecontext(repositoryUrl, gitBranch, env)
    }

    if (!kubecontext) {
      logger.debug(
        { repositoryUrl, gitBranch },
        "no env matching for current ref"
      )
      return false
    }

    const jobName = pipelineJobName({
      eventName,
      repositoryName,
      gitBranch,
    })

    logger.info(
      `event ${eventName} triggering workflow on ${repository}#${ref} ${gitCommit}`
    )

    const webhookUri = ctx.require("config.project.oas.uri")
    const webhookToken = ctx.require("config.project.webhook.token")

    if (commits) {
      commits = commits.reduce(
        (acc, commit) => {
          acc.added.push(...commit.added)
          acc.modified.push(...commit.modified)
          acc.removed.push(...commit.removed)
          return acc
        },
        { added: [], modified: [], removed: [] }
      )
    }

    const manifest = pipelineJob({
      namespace: jobNamespace,
      name: jobName,
      args,
      initContainers,
      checkout,
      repositoryUrl,
      env,
      gitBranch,
      gitCommit,
      defaultBranch,
      webhookUri,
      webhookToken,
      commits,
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
      throw err
    }

    return true
  }
}
