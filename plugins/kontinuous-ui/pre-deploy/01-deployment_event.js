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
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhYndzdW53Y3VrcmV5bm1lZ2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU2NDQwMDksImV4cCI6MjA0MTIyMDAwOX0.8779ZywO5dvRLfMGMShlxBUqGeqC6WK4k3e0puBN7So"
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

// ../kontinuous/kontinuous deploy --kubeconfig-context ovh-dev --dry-run -d
