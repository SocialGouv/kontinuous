const { setTimeout: sleep } = require("timers/promises")

const getLogger = require("./get-logger")

module.exports = async (
  {
    namespace,
    selector,
    abortSignal,
    checkForNewResourceInterval = 3000,
    watchingTimeout = 3600000, // 60 minutes
    logger = getLogger(),
  },
  callback
) => {
  let timeoutReached = false
  const globalTimeout = setTimeout(() => {
    timeoutReached = true
  }, watchingTimeout)

  while (!abortSignal?.aborted && !timeoutReached) {
    const status = await callback()
    if (status !== undefined) {
      clearTimeout(globalTimeout)
      return status
    }
    await sleep(checkForNewResourceInterval)
    logger.trace(
      { namespace, selector },
      `watching resource: ${selector}, waiting to appear...`
    )
  }
  clearTimeout(globalTimeout)
  return { success: null }
}
