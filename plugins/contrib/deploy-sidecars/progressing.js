const getEventUniqKey = (param) => {
  const { namespace, resourceName } = param
  return `${namespace}/${resourceName}`
}

module.exports = async (
  sidecars,
  options,
  { logger, utils, dryRun, deploysPromise, runContext }
) => {
  if (dryRun) {
    return
  }

  const { prettyTime, promiseAll } = utils

  const { interval = 15, globalProgressingInitialDelay = 5 } = options

  const elapsedMap = {}

  const getElapsed = (key) => {
    const elapsed = prettyTime(new Date() - elapsedMap[key])
    return elapsed
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

  const stopSidecar = () => {
    for (const i of Object.values(intervalsMap)) {
      clearInterval(i)
    }
    for (const p of Object.values(promisesMap)) {
      if (!p.ended) {
        p.resolve(null)
      }
    }
  }

  const { eventsBucket } = runContext

  let countTotal
  eventsBucket.on("initDeployment", ({ countAllRunnable }) => {
    countTotal = countAllRunnable
  })

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
    globalProgressing()
  }, globalProgressingInitialDelay * 1000)

  eventsBucket.on("waiting", (param) => {
    const key = getEventUniqKey(param)
    let i = 0
    const intvl = setInterval(() => {
      if (i++ === 0) {
        return
      }
      logState("⏳ progressing", param)
    }, interval * 1000)
    intervalsMap[key] = intvl
    promisesMap[key] = publicPromise()
    elapsedMap[key] = new Date()
  })
  eventsBucket.on("ready", (param) => {
    const key = getEventUniqKey(param)
    promisesMap[key].resolve(true)
    clearInterval(intervalsMap[key])
    logState("✔ ready", param)
  })
  eventsBucket.on("failed", (param) => {
    const key = getEventUniqKey(param)
    const msg = "❌ failed"
    const err = new Error(getStateMsg(msg, param))
    promisesMap[key].resolve(err)
    clearInterval(intervalsMap[key])
    logState(msg, param)
  })
  eventsBucket.on("closed", (param) => {
    const key = getEventUniqKey(param)
    promisesMap[key].resolve(null)
    clearInterval(intervalsMap[key])
  })

  const promise = new Promise(async (resolve, reject) => {
    await Promise.allSettled([deploysPromise])
    stopSidecar()
    try {
      const results = await promiseAll(Object.values(promisesMap))
      const errors = results.filter((result) => result instanceof Error)
      resolve({ errors })
    } catch (err) {
      reject(err)
    }
  })

  sidecars.push({ stopSidecar, promise })
}
