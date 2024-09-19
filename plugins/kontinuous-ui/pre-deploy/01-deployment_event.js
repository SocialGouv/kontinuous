const supabase = require("../lib/supabase")

module.exports = async (_manifests, _options, { config, logger }) => {
  const {
    gitSha,
    projectName,
    environment,
    gitBranch,
    repositoryName,
    gitRepositoryUrl,
    pipelineUUID,
  } = config

  const values = {
    uuid: pipelineUUID,
    status: "pre-deploy",
    commit_hash: gitSha,
    project: projectName,
    environment,
    branch: gitBranch,
    repository: repositoryName,
    repository_url: gitRepositoryUrl,
  }

  const { error } = await supabase.from("deployments_logs").insert([values])

  if (error) throw error

  logger.info(values, "FINISHED")
}
