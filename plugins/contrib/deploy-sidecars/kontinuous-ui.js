module.exports = async (options, { logger, utils, dryRun, ctx }) => {
  if (dryRun) {
    return
  }

  const eventsBucket = ctx.require("eventsBucket")
  const abortController = ctx.require("abortController")

  const waitingFor = []
  eventsBucket.on("resource:created", ({ manifests }) => {
    waitingFor.push(
      new Promise(async (resolve, reject) => {
        try {
          // TODO push events
          resolve(e)
        } catch (e) {
          reject(e)
        }
        // await
      })
    )
  })

  return new Promise(async (res, rej) => {
    while (true) {
      if (abortController.signal.aborted) {
        try {
          await Promise.all(...waitingFor)
          res()
        } catch (err) {
          rej(err)
        }
        return
      }
      await sleep(1)
    }
  })
}
