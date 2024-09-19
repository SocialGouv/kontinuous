// const { createClient } = require("@supabase/supabase-js")

module.exports = async (manifests, _options, { config, logger }) => {
  const { repositoryName } = config
  logger.debug("*****> REPOSITORY NAME:", repositoryName)

  // const supabase = createClient(
  //   "https://dabwsunwcukreynmegja.supabase.co",
  //   "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhYndzdW53Y3VrcmV5bm1lZ2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjU2NDQwMDksImV4cCI6MjA0MTIyMDAwOX0.8779ZywO5dvRLfMGMShlxBUqGeqC6WK4k3e0puBN7So"
  // )
  // logger.info("Creation du client supabase")
  // const { data, error } = await supabase.from("users").select("*")
  // logger.info("Execution de la requete", error)
  // if (error) throw error
  // logger.info("DATA:", JSON.stringify(data, null, 2))
  logger.info("CONFIG", config)
}

// ../kontinuous/kontinuous deploy --kubeconfig-context ovh-dev --dry-run -d
