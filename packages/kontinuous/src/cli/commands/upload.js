const upload = require("~/upload")

const options = require("../options")

module.exports = (program) =>
  program
    .command("upload")
    .argument("<file>", "the file to upload")
    .argument("[name]", `the manifests name to download, default "manifests"`)
    .addOption(options.uploadUrl)
    .addOption(options.webhookUri)
    .description("Upload manifests")
    .action(async (file, name, _opts, _command) => {
      await upload({ name, file })
    })
