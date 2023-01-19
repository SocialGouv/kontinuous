const { EventEmitter } = require("node:events")

const ctx = require("~common/ctx")
const logger = require("~common/utils/logger")

const ExitError = require("~/errors/exit-error")

const createProgram = require("./program")

const sentry = require("./sentry")

const addCommands = [
  require("./commands/build"),
  require("./commands/deploy"),
  require("./commands/env"),
  require("./commands/config"),
  require("./commands/init"),
  require("./commands/slugify"),
  require("./commands/load-deps"),
  require("./commands/logs"),
  require("./commands/diff"),
  require("./commands/clean"),
  require("./commands/upload"),
  require("./commands/download"),
  require("./commands/test"),
]

const gracefullShutdownTimeoutMs = 2000

module.exports = async (args = process.argv) => {
  ctx.provide()

  const signals = ["SIGTERM", "SIGHUP", "SIGINT"]
  const events = new EventEmitter()
  ctx.set("events", events)
  const abortController = new AbortController()
  ctx.set("abortController", abortController)
  ctx.set("abortSignal", abortController.signal)
  signals.forEach((signal) => {
    process.on(signal, () => {
      if (abortController.signal.aborted) {
        if (signal === "SIGINT") {
          logger.info(`${signal} received twice, killing now`)
          process.exit(1)
        }
        return
      }
      events.emit("stop")
      logger.info(
        {
          gracefullShutdownTimeoutMs,
        },
        `${signal} received, aborting...`
      )
      abortController.abort() // if we pass argument, we can't detect AbortError anymore, so we have to let it empty
      const shutdownTimeout = setTimeout(() => {
        logger.info(`shutdown timeout reached, killing now`, {
          gracefullShutdownTimeoutMs,
        })
        process.exit(1)
      }, gracefullShutdownTimeoutMs)
      events.on("finish", () => {
        clearTimeout(shutdownTimeout)
      })
    })
  })

  const program = createProgram()
  addCommands.forEach((addCommand) => addCommand(program))

  const Sentry = sentry.init()
  if (Sentry) {
    program.hook("preAction", sentry.preActionFactory(Sentry))
  }

  let exitCode = 0
  let error
  try {
    await program.parseAsync(args)
    events.emit("success")
  } catch (err) {
    error = err
    if (error instanceof ExitError) {
      exitCode = error.exitCode
      error = error.error
    } else {
      exitCode = 1
    }
    if (Sentry) {
      Sentry.captureException(error)
    }
    events.emit("failed")
    throw error
  } finally {
    if (Sentry) {
      await Sentry.close(5000)
    }
    logger.error(error)
    events.emit("finish")
    process.exit(exitCode)
  }
}
