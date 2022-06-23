const { configureDebug } = require("~common/utils/logger")
const upload = require("~/upload")

const options = require("../options")

module.exports = (program) =>
  program
    .command("upload")
    .argument("<file>", "the file to upload")
    .argument("[name]", `the manifests name to download, default "manifests"`)
    .addOption(options.uploadUrl)
    .description("Upload manifests")
    .action(async (file, name, _opts, command) => {
      const opts = command.optsWithGlobals()
      configureDebug(opts.D)
      await upload({ name, file })
    })
