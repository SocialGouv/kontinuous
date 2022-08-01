const { ctx } = require("@modjo-plugins/core")
const { reqCtx } = require("@modjo-plugins/express/ctx")

const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const cleanGitRef = require("~common/utils/clean-git-ref")

const loadRemoteConfig = require("~common/config/load-remote-config")
const jobRun = require("~/k8s/command/job-run")
const pipelineJob = require("~/k8s/resources/pipeline.job")
const pipelineJobName = require("~/k8s/resources/pipeline.job-name")

module.exports = ({ services }) => {
  const logger = ctx.require("logger")
  return async ({
    eventName,
    env,
    ref,
    after,
    repositoryUrl,
    args,
    checkout,
    initContainers,
    commits,
  }) => {
    const repositoryPath = repositoryFromGitUrl(repositoryUrl)
    const repositoryName = repositoryPath.split("/").pop()
    const gitBranch = cleanGitRef(ref)
    const gitCommit = after || "0000000000000000000000000000000000000000"

    const branchConfig = eventName === "deleted" ? "HEAD" : gitBranch
    const repositoryConfig = await loadRemoteConfig(
      {
        repository: repositoryUrl,
        ref: branchConfig,
      },
      { git: false, gitSha: gitCommit }
    )
    const { cluster } = repositoryConfig
    const project = reqCtx.require("project")
    const jobNamespace = reqCtx.require("jobNamespace")

    let kubeconfig
    try {
      kubeconfig = await services.getKubeconfig(cluster)
    } catch (_error) {
      return false
    }

    if (!env) {
      env = repositoryConfig.env
    }

    if (!env) {
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

    const webhookUri = ctx.require("config.project.oas.uri")
    const tokens = ctx.require("config.project.secrets.tokens")

    const [webhookToken] = tokens[project] || []

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
      project,
      webhookUri,
      webhookToken,
      commits,
    })

    return async () => {
      logger.info(
        `event ${eventName} triggering workflow on ${repositoryPath}#${ref} ${gitCommit}`
      )
      try {
        await jobRun(manifest, kubeconfig)
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
}
