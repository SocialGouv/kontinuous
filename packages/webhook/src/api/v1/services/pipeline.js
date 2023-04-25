const { ctx } = require("@modjo/core")
const { reqCtx } = require("@modjo/express/ctx")

const repositoryFromGitUrl = require("~common/utils/repository-from-git-url")
const cleanGitRef = require("~common/utils/clean-git-ref")
const normalizeRepositoryKey = require("~common/utils/normalize-repository-key")

const jobRun = require("~/k8s/command/job-run")
const pipelineJob = require("~/k8s/resources/pipeline.job")
const pipelineJobName = require("~/k8s/resources/pipeline.job-name")

module.exports = ({ services }) => {
  const logger = ctx.require("logger")
  const config = ctx.require("config")
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
    cluster,
    chart,
    ignoreProjectTemplates,
    kontinuousVersion,
    mountKubeconfig,
    serviceAccountName,
    mountSecrets,
  }) => {
    const repositoryPath = repositoryFromGitUrl(repositoryUrl)
    const repositoryName = repositoryPath.split("/").pop()
    const gitBranch = cleanGitRef(ref)
    const gitCommit = after || "0000000000000000000000000000000000000000"

    const { repositories } = config.project
    const repositoryKey = normalizeRepositoryKey(repositoryUrl)
    const repo = repositories[repositoryKey]

    const deployKey = repo?.deployKeyFile

    const repositoryConfig = await services.getRepoConfig({
      repository: repositoryUrl,
      gitBranch,
      gitSha: gitCommit,
      event: eventName,
      environment: env,
      deployKey,
    })

    if (!env) {
      env = repositoryConfig.environment
    }
    if (!env) {
      logger.debug(
        { repositoryUrl, gitBranch },
        "no env matching for current ref"
      )
      return false
    }

    if (!cluster) {
      cluster = repositoryConfig.cluster
    }
    if (!cluster) {
      logger.debug({ repositoryUrl, gitBranch, env }, "no cluster matching")
      return false
    }

    const project = reqCtx.require("project")
    const jobNamespace = reqCtx.require("jobNamespace")

    let kubeconfig
    try {
      kubeconfig = await services.getKubeconfigForCiNamespace(cluster)
    } catch (_error) {
      return false
    }

    const jobName = pipelineJobName({
      env,
      eventName,
      repositoryName,
      gitBranch,
      chart,
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

    const deployKeyCiSecretName = repo?.private && repo.deployKeyCiSecretName

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
      deployKeyCiSecretName,
      chart,
      ignoreProjectTemplates,
      kontinuousVersion,
      mountKubeconfig,
      serviceAccountName,
      mountSecrets,
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
