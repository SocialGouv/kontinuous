const ctx = require("~/ctx")

const program = require("./program")

require("./command.build")
require("./command.deploy")
require("./command.env")
require("./command.slugify")
require("./command.upload")
require("./command.commit-token")
require("./command.logs")

module.exports = async (args = process.argv) => {
  ctx.provide()
  return program.parseAsync(args)
}
