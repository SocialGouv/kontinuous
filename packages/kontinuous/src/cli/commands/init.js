const init = require("~/init")

const options = require("../options")

module.exports = (program) =>
  program
    .command("init")
    .description("Init project repository with boilerplate")
    .addOption(options.cwd)
    .option("--dev", "init also local dev environment config")
    .option("--boilerplate, -b", "specify boilerplate url, repository or name")
    .option("--overwrite", "overwrite existing file")
    .option("--plugin <plugins...>", "kontinuous plugin(s) to install")
    .option("--name", "project name")
    .action(async (opts, _command) => {
      await init(opts)
    })
