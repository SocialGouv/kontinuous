const { createClient } = require("@supabase/supabase-js")

module.exports = async (_manifests, _options, { config }) => {
  const {
    action,
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
      status: action,
      commit_hash: gitSha,
      project: projectName,
      environment,
      branch: refLabelValue,
      repository: repositoryName,
    },
  ])

  if (error) throw error
}

// ../kontinuous/kontinuous deploy --kubeconfig-context ovh-dev --dry-run -d
