const getEventUniqKey = (param) => {
  const { namespace, resourceName } = param
  return `${namespace}/${resourceName}`
}

module.exports = async (options, { logger, utils, dryRun, ctx }) => {
  if (dryRun) {
    return
  }

  const { prettyTime, promiseAll } = utils

  const { interval = 15, globalProgressingInitialDelay = 5 } = options

  const elapsedMap = {}

  const getElapsed = (key) => {
    if (elapsedMap[key]) {
      const elapsed = prettyTime(new Date() - elapsedMap[key])
      return elapsed
    }
  }

  const getStateMsg = (msg, param) => {
    const key = getEventUniqKey(param)
    const { resourceName } = param
    const elapsed = getElapsed(key)
    return `${msg}: ${resourceName} [${elapsed}]`
  }
  const logState = (msg, param) => {
    const { namespace } = param
    logger.info({ namespace }, getStateMsg(msg, param))
  }

  const { publicPromise } = utils

  const promisesMap = {}
  const intervalsMap = {}

  let ended = false
  const cleanUp = () => {
    for (const i of Object.values(intervalsMap)) {
      clearInterval(i)
    }
    for (const p of Object.values(promisesMap)) {
      if (!p.ended) {
        p.resolve(null)
      }
    }
  }

  const eventsBucket = ctx.require("eventsBucket")

  let countTotal
  eventsBucket.on(
    "deploy-with:plugin:initDeployment",
    ({ countAllRunnable }) => {
      countTotal = countAllRunnable
    }
  )

  const globalProgressing = () => {
    elapsedMap[".global"] = new Date()
    intervalsMap[".global"] = setInterval(() => {
      const promiseValues = Object.values(promisesMap)
      const countLaunched = promiseValues.length
      if (!countTotal) {
        return
      }
      const countResolved = promiseValues.reduce(
        (n, { resolved }) => (resolved ? n + 1 : n),
        0
      )
      const countLoading = countLaunched - countResolved
      const elapsed = getElapsed(".global")
      logger.info(
        `↪️  ready [${countResolved}/${countTotal}], loading [${countLoading}], elapsed: [${elapsed}]`
      )
    }, interval * 1000)
  }
  setTimeout(() => {
    if (ended) {
      return
    }
    globalProgressing()
  }, globalProgressingInitialDelay * 1000)

  eventsBucket.on("resource:waiting", (param) => {
    const key = getEventUniqKey(param)
    let i = 0
    elapsedMap[key] = new Date()
    const intvl = setInterval(() => {
      if (i++ === 0) {
        return
      }
      logState("⏳ progressing", param)
    }, interval * 1000)
    intervalsMap[key] = intvl
    promisesMap[key] = publicPromise()
  })
  eventsBucket.on("resource:ready", (param) => {
    const key = getEventUniqKey(param)
    promisesMap[key].resolve(true)
    clearInterval(intervalsMap[key])
    logState("✔ ready", param)
  })
  eventsBucket.on("resource:failed", (param) => {
    const key = getEventUniqKey(param)
    const msg = "❌ failed"
    const err = new Error(getStateMsg(msg, param))
    promisesMap[key].resolve(err)
    clearInterval(intervalsMap[key])
    logState(msg, param)
  })
  eventsBucket.on("resource:closed", (param) => {
    const key = getEventUniqKey(param)
    promisesMap[key].resolve(null)
    clearInterval(intervalsMap[key])
  })

  return new Promise((resolve, reject) => {
    eventsBucket.on("deploy-with:finish", async () => {
      try {
        ended = true
        cleanUp()
        const results = await promiseAll(Object.values(promisesMap))
        const errors = results.filter((result) => result instanceof Error)
        resolve({ errors })
      } catch (err) {
        reject(err)
      }
    })
  })
}
