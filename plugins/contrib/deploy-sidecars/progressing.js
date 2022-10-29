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

  const { prettyTime } = utils

  const { interval = 15, globalProgressingInitialDelay = 5 } = options

  const elapsedMap = {}

  const getElapsed = (key) => {
    const elapsed = prettyTime(new Date() - elapsedMap[key])
    return elapsed
  }

  const logState = (msg, param) => {
    const key = getEventUniqKey(param)
    const { namespace, resourceName } = param
    const elapsed = getElapsed(key)
    logger.info({ namespace }, `${msg}: ${resourceName} [${elapsed}]`)
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
        p.reject()
      }
    }
  }

  const { eventsBucket } = runContext

  const globalProgressing = () => {
    elapsedMap[".global"] = new Date()
    intervalsMap[".global"] = setInterval(() => {
      const promiseValues = Object.values(promisesMap)
      const countTotal = promiseValues.length
      const countResolved = promiseValues.reduce(
        (n, { resolved }) => (resolved ? n + 1 : n),
        0
      )
      const elapsed = getElapsed(".global")
      logger.info(
        `↪️  loading [${countResolved}/${countTotal}], elapsed: [${elapsed}]`
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
    promisesMap[key].resolve()
    clearInterval(intervalsMap[key])
    logState("🗸 ready", param)
  })
  eventsBucket.on("failed", (param) => {
    const key = getEventUniqKey(param)
    promisesMap[key].reject()
    clearInterval(intervalsMap[key])
    logState("❌ failed", param)
  })

  const promise = Promise.allSettled(Object.values(promisesMap))

  sidecars.push({ stopSidecar, promise })
  ;(async () => {
    await deploysPromise
    stopSidecar()
  })()
}
