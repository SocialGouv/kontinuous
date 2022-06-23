const ctx = require("~/ctx")

const createProgram = require("./program")

const addCommands = [
  require("./commands/build"),
  require("./commands/deploy"),
  require("./commands/env"),
  require("./commands/slugify"),
  require("./commands/upload"),
  require("./commands/logs"),
  require("./commands/clean"),
]

module.exports = async (args = process.argv) => {
  ctx.provide()
  const program = createProgram()
  addCommands.forEach((addCommand) => addCommand(program))
  return program.parseAsync(args)
}
