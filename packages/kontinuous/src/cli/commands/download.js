const download = require("~/download")

const options = require("../options")

module.exports = (program) =>
  program
    .command("download")
    .argument("[name]", `the manifests name to download, default "manifests"`)
    .argument("[file]", 'default "${name}.yaml"')
    .addOption(options.downloadUrl)
    .addOption(options.webhookUri)
    .description("Download manifests")
    .action(async (name, file, _opts, _command) => {
      await download({ name, file })
    })
