const { configureDebug } = require("~common/utils/logger")
const fs = require("fs-extra")
const upload = require("~/upload")

const options = require("../options")

module.exports = (program) =>
  program
    .command("upload")
    .argument("<file>", "the file to upload")
    .argument("<upload-url>", "the url to upload")
    .description("Upload manifests")
    .addOption(options.webhookBaseDomain)
    .action(async (file, uploadUrl, _opts, command) => {
      const opts = command.optsWithGlobals()
      configureDebug(opts.D)
      const manifests = await fs.readFile(file, { encoding: "utf8" })
      await upload({ uploadUrl, manifests })
    })
