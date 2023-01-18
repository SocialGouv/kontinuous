const omit = require("lodash.omit")

const ctx = require("~common/ctx")
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
  require("./commands/logs"),
  require("./commands/diff"),
  require("./commands/clean"),
  require("./commands/upload"),
  require("./commands/download"),
  require("./commands/test"),
]

module.exports = async (args = process.argv) => {
  ctx.provide()
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
  try {
    await program.parseAsync(args)
  } catch (err) {
    let error = err
    if (error instanceof ExitError) {
      exitCode = error.exitCode
      error = error.error
    } else {
      exitCode = 1
    }
    if (sentry) {
      sentry.captureException(error)
    }
    throw error
  } finally {
    if (sentry) {
      await sentry.close(5000)
    }
    process.exit(exitCode)
  }
}
