const { createClient } = require("@supabase/supabase-js")

module.exports = async (_manifests, _options, { config }) => {
  const {
    actionCommandName,
    gitSha,
    projectName,
    environment,
    refLabelValue,
    repositoryName,
  } = config

  const supabase = createClient(
    "https://dabwsunwcukreynmegja.supabase.co",
    "XXXX"
  )

  const { error } = await supabase.from("deployments_logs").insert([
    {
      status: actionCommandName,
      commit_hash: gitSha,
      project: projectName,
      environment,
      branch: refLabelValue,
      repository: repositoryName,
    },
  ])

  if (error) throw error
}
