const { createClient } = require("@supabase/supabase-js")

module.exports = async (_manifests, _options, { config, ctx }) => {
  const processEnv = ctx.get("env") || process.env
  const { SUPABASE_URL: supabaseUrl, SUPABASE_KEY: supabaseKey } = processEnv
  console.log("ENV", processEnv, supabaseUrl, supabaseKey)
  const {
    gitSha,
    projectName,
    environment,
    refLabelValue,
    repositoryName,
    actionCommandName,
  } = config

  const supabase = createClient(supabaseUrl, supabaseKey)

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
