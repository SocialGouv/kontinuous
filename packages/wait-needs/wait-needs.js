const rolloutStatusWatch = require("~common/utils/rollout-status-watch")
const logger = require("~common/utils/logger")

const runWaitNeeds = async ({ waitNeeds, timeout = 900 }) => {
  const interceptor = {}

  setTimeout(() => {
    interceptor.stop = true
    setTimeout(() => {
      process.exit(1)
    }, 1000)
  }, timeout * 1000)

  const promises = []
  for (const { namespace, selectors } of waitNeeds) {
    const selector = Object.entries(selectors)
      .map(([label, value]) => `${label}=${value}`)
      .join(",")

    promises.push(
      new Promise(async (resolve, reject) => {
        try {
          logger.info({ namespace, selector }, `watching`)
          const result = await rolloutStatusWatch({
            namespace,
            selector,
            interceptor,
            // rolloutStatusProcesses,
            // kubeconfig,
            // kubecontext,
            logger,
          })
          resolve(result)
        } catch (err) {
          reject(err)
        }
      })
    )
  }

  const results = await Promise.allSettled(promises)
  const errors = []
  for (const result of results) {
    const { status } = result
    if (status === "rejected") {
      const { reason } = result
      if (reason && Object.keys(reason) > 0) {
        logger.error({ reason }, "rollout-status exec error")
      }
    } else if (status === "fulfilled") {
      const { value } = result
      if (value.success === false) {
        errors.push(value.error)
      }
    } else {
      logger.fatal({ result }, `unexpected promise result`)
    }
  }
  if (errors.length > 0) {
    process.exit(1)
  } else {
    logger.info("all dependencies are ready")
  }
}

const main = async () => {
  const jsonWaitNeeds = process.env.WAIT_NEEDS
  const waitNeeds = JSON.parse(jsonWaitNeeds)
  let timeout = process.env.TIMEOUT
  if (timeout) {
    timeout = parseInt(timeout, 10)
  } else {
    timeout = undefined
  }
  runWaitNeeds({ waitNeeds, timeout })
}

main()
