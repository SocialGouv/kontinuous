const { watch } = require("node:fs/promises")

const fs = require("fs-extra")

const { ctx } = require("@modjo-plugins/core")

module.exports = async () => {
  const logger = ctx.require("logger")

  const sharedSecretDir = `/secrets/shared`
  if (!(await fs.pathExists(sharedSecretDir))) {
    return
  }

  const _config = ctx.require("config")
  const reloadConfig = (_event) => {
    logger.info("shared secret changes detected, reloading config...")
    // TODO
  }

  const ac = new AbortController()
  const { signal } = ac
  const shutdownHandlers = ctx.require("shutdownHandlers")
  shutdownHandlers.push(() => {
    ac.abort()
  })
  ;(async () => {
    try {
      const watcher = watch(sharedSecretDir, { signal })
      for await (const event of watcher) {
        reloadConfig(event)
      }
    } catch (err) {
      if (err.name === "AbortError") return
      throw err
    }
  })()
}
