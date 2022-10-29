module.exports = async (
  sidecars,
  options,
  { logger, utils, dryRun, deploysPromise, runContext }
) => {
  if (dryRun) {
    return
  }

  const { interval = 15 } = options

  const progressingLogger = (param) => {
    const { namespace, ressourceName } = param
    logger.info(`⏳ progressing: ${namespace}/${ressourceName}`)
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

  const getEventUniqKey = (param) => {
    const { namespace, resourceName } = param
    return `${namespace}/${resourceName}`
  }

  const { eventsBucket } = runContext

  eventsBucket.on("waiting", (param) => {
    const key = getEventUniqKey(param)
    const intvl = setInterval(() => {
      progressingLogger(param)
    }, interval * 1000)
    intervalsMap[key] = intvl
    promisesMap[key] = publicPromise()
  })
  eventsBucket.on("ready", (param) => {
    const key = getEventUniqKey(param)
    promisesMap[key].resolve()
    clearInterval(intervalsMap[key])
  })
  eventsBucket.on("failed", (param) => {
    const key = getEventUniqKey(param)
    promisesMap[key].reject()
    clearInterval(intervalsMap[key])
  })

  const promise = Promise.allSettled(Object.values(promisesMap))

  sidecars.push({ stopSidecar, promise })

  await deploysPromise
  stopSidecar()
}
