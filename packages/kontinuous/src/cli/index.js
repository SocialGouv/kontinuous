const ctx = require("~common/ctx")

const createEventsBucket = require("~common/utils/events-bucket")
const flattenAggregateError = require("~common/utils/flatten-aggregate-error")
const isAbortError = require("~common/utils/is-abort-error")

const ExitError = require("~/errors/exit-error")

const createLogger = require("~/lib/logger")

const sentry = require("~/sentry")
const createProgram = require("./program")

const addCommands = [
  require("./commands/build"),
  require("./commands/deploy"),
  require("./commands/env"),
  require("./commands/config"),
  require("./commands/init"),
  require("./commands/slugify"),
  require("./commands/slugify-subdomain"),
  require("./commands/load-deps"),
  require("./commands/logs"),
  require("./commands/diff"),
  require("./commands/clean"),
  require("./commands/upload"),
  require("./commands/download"),
  require("./commands/test"),
]

module.exports = async (args = process.argv) => {
  ctx.provide()

  const logger = ctx.get("logger") || ctx.set("logger", createLogger())

  const signals = ["SIGTERM", "SIGHUP", "SIGINT"]

  const eventsBucket = createEventsBucket()
  ctx.set("eventsBucket", eventsBucket)

  const abortController = new AbortController()
  ctx.set("abortConfig", {
    gracefullShutdownTimeoutSeconds:
      parseInt(process.env.KS_GRACEFULL_SHUTDOWN_TIMEOUT_SECONDS, 10) || 2,
  })

  ctx.set("abortController", abortController)
  ctx.set("abortSignal", abortController.signal)
  signals.forEach((signal) => {
    process.on(signal, () => {
      const { gracefullShutdownTimeoutSeconds } = ctx.require("abortConfig")
      if (abortController.signal.aborted) {
        if (signal === "SIGINT") {
          logger.info(`🔫 ${signal} received twice, killing now`)
          process.exit(1)
        }
        return
      }
      eventsBucket.emit("stop")
      logger.info(
        {
          gracefullShutdownTimeoutSeconds,
        },
        `⏹️  ${signal} received, aborting...`
      )
      abortController.abort() // if we pass argument, we can't detect AbortError anymore, so we have to let it empty
      const shutdownTimeout = setTimeout(() => {
        logger.info(`🔫 shutdown timeout reached, killing now`, {
          gracefullShutdownTimeoutSeconds,
        })
        process.exit(1)
      }, gracefullShutdownTimeoutSeconds * 1000)
      eventsBucket.on("finish", () => {
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
    eventsBucket.emit("success")
  } catch (err) {
    error = err
    if (error instanceof ExitError) {
      exitCode = error.exitCode
      error = error.error
    } else {
      exitCode = 1
    }
    if (Sentry) {
      if (error instanceof AggregateError) {
        /* 
          sentry doesn't support AggregateError at now,
          so if we want full details we have to flatten it,
          see
            https://github.com/getsentry/sentry-javascript/issues/5469
            https://github.com/getsentry/sentry/issues/37716
        */
        error = flattenAggregateError(error)
      }
      Sentry.captureException(error)
    }
    eventsBucket.emit("failed")
    throw error
  } finally {
    if (Sentry) {
      await Sentry.close(5000)
    }
    if (error) {
      if (isAbortError(error)) {
        logger.warn("🔨 operation cancelled gracefully")
      } else if (error instanceof AggregateError) {
        logger.error(flattenAggregateError(error))
      } else {
        logger.error(error)
      }
    }
    eventsBucket.emit("finish")
    process.exit(exitCode)
  }
}
