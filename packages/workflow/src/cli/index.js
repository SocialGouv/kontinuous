const program = require("./program")

require("./command.build")
require("./command.deploy")
require("./command.env")
require("./command.slugify")

module.exports = (args = process.argv) => program.parse(args)
