const program = require("./program")

require("./command.build")
require("./command.deploy")
require("./command.env")
require("./command.slugify")
require("./command.upload")
require("./command.commit-token")
require("./command.logs")

module.exports = (args = process.argv) => program.parseAsync(args)
