const { configureDebug } = require("~common/utils/logger")
const download = require("~/download")

const options = require("../options")

module.exports = (program) =>
  program
    .command("download")
    .argument("[name]", `the manifests name to download, default "manifests"`)
    .argument("[file]", 'default "${name}.yaml"')
    .addOption(options.downloadUrl)
    .addOption(options.webhookUri)
    .description("Upload manifests")
    .action(async (name, file, _opts, command) => {
      const opts = command.optsWithGlobals()
      configureDebug(opts.D)
      await download({ name, file })
    })
