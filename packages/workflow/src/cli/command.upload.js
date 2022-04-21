const { configureDebug } = require("~common/utils/logger")
const fs = require("fs-extra")
const upload = require("~/upload")

const program = require("./program")

module.exports = program
  .command("upload")
  .argument("<file>", "the file to upload")
  .argument("<upload-url>", "the url to upload")
  .description("Upload manifests")
  .action(async (file, uploadUrl, _opts, command) => {
    const opts = command.optsWithGlobals()
    configureDebug(opts.D)
    const manifests = await fs.readFile(file)
    await upload({ uploadUrl, manifests })
  })
