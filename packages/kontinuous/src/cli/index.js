const { EventEmitter } = require("node:events")

const omit = require("lodash.omit")

const ctx = require("~common/ctx")
const logger = require("~common/utils/logger")

const ExitError = require("~/errors/exit-error")

const createProgram = require("./program")

const Sentry = require("./sentry")

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

  const sentry = Sentry.init()

  program.hook("preAction", async (_thisCommand, actionCommand) => {
    const commandName = actionCommand.name()
    const config = ctx.require("config")
    const opts = actionCommand.optsWithGlobals()
    if (sentry) {
      ctx.set("sentry", sentry)
      sentry.setContext("config", omit(config, ["webhookToken", "sentryDSN"]))
      sentry.setContext("command", {
        name: commandName,
        opts,
        argv: process.argv,
        env: Object.entries(process.env).reduce((acc, [key, value]) => {
          if (
            !key.startsWith("KS_") ||
            !key.startsWith("GIT") || // git, github, gitlab
            key.includes("TOKEN") ||
            key === "KS_SENTRY_DSN" ||
            key === "KS_NOTIFY_WEBHOOK_URL"
          ) {
            return acc
          }
          acc[key] = value
          return acc
        }, {}),
      })
    }
  })

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
    if (sentry) {
      sentry.captureException(error)
    }
    events.emit("failed")
    throw error
  } finally {
    if (sentry) {
      await sentry.close(5000)
    }
    logger.error(error)
    events.emit("finish")
    process.exit(exitCode)
  }
}
