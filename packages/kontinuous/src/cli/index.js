const omit = require("lodash.omit")

const ctx = require("~common/ctx")

const createProgram = require("./program")

const sentry = require("./sentry")

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

  sentry.init()
  let transaction
  program.hook("preAction", async (_thisCommand, actionCommand) => {
    const commandName = actionCommand.name()
    const config = ctx.require("config")
    const opts = actionCommand.optsWithGlobals()
    sentry.setContext("config", omit(config, ["webhookToken"]))
    sentry.setContext("command", {
      name: commandName,
      opts,
      argv: process.argv,
      env: Object.entries(process.env).reduce((acc, [key, value]) => {
        if (!key.startsWith("KS_")) {
          return acc
        }
        if (key.includes("TOKEN")) {
          return acc
        }
        acc[key] = value
        return acc
      }, {}),
    })
    transaction = sentry.startTransaction({
      op: `cli.${commandName}`,
      name: `cli command "${commandName}"`,
    })
  })

  try {
    await program.parseAsync(args)
  } catch (error) {
    sentry.captureException(error)
    throw error
  } finally {
    if (transaction) {
      transaction.finish()
    }
  }
}
