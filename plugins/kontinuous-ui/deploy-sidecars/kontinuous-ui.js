const { setTimeout: sleep } = require("timers/promises")
const supabase = require("../lib/supabase")

module.exports = async (_options, { config, dryRun, ctx }) => {
  if (dryRun) {
    return
  }

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
    commit_hash: gitSha,
    project: projectName,
    environment,
    branch: gitBranch,
    repository: repositoryName,
    repository_url: gitRepositoryUrl,
  }

  const eventsBucket = ctx.require("eventsBucket")
  // const abortController = ctx.require("abortController")

  // resource:waiting
  // resource:failed
  // resource:ready
  // resource:closed

  async function insertValues(data) {
    const { error } = await supabase.from("deployments_logs").insert([data])
    if (error) throw error
  }

  const waitingFor = []
  eventsBucket.on("resource:waiting", () => {
    waitingFor.push(
      new Promise(async (resolve, reject) => {
        try {
          const valuesToInsert = { ...values, status: "waiting" }
          await insertValues(valuesToInsert)
          resolve()
        } catch (e) {
          reject(e)
        }
        // await
      })
    )
  })

  eventsBucket.on("resource:ready", () => {
    waitingFor.push(
      new Promise(async (resolve, reject) => {
        try {
          const valuesToInsert = { ...values, status: "ready" }
          await insertValues(valuesToInsert)
          resolve()
        } catch (e) {
          reject(e)
        }
        // await
      })
    )
  })

  eventsBucket.on("resource:failed", () => {
    waitingFor.push(
      new Promise(async (resolve, reject) => {
        try {
          const valuesToInsert = { ...values, status: "failed" }
          await insertValues(valuesToInsert)
          resolve()
        } catch (e) {
          reject(e)
        }
        // await
      })
    )
  })

  let finished
  eventsBucket.on("deploy-with:finish", () => {
    finished = true
  })

  return new Promise(async (res, rej) => {
    while (true) {
      if (finished) {
        console.log("WAITING FOR...")
        try {
          await Promise.all(waitingFor)
          res()
        } catch (err) {
          console.log("ERROR", err)
          rej(err)
        }
        return
      }
      await sleep(1)
    }
  })
}
