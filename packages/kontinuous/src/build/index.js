const launch = require("launch-editor")
const { highlight, fromJson: themeFromJson } = require("cli-highlight")

const ctx = require("~common/ctx")
const upload = require("~/upload")
const builder = require("./builder")

module.exports = async (options) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")

  const result = await builder(options)

  const { manifestsFile, manifests } = result

  if (options.O) {
    let m = manifests
    if (options.S) {
      const theme = themeFromJson({
        keyword: "blue",
        built_in: ["cyan", "dim"],
        string: "green",
        default: "gray",
      })
      m = highlight(m, {
        language: "~common/utils/yaml",
        theme,
      })
    }
    process.stdout.write(m)
  } else {
    logger.info(`📦 manifests: file://${manifestsFile}`)
  }

  if (config.upload) {
    await upload({ file: manifestsFile })
  }

  if (options.open) {
    launch(manifestsFile, config.editor)
  }

  return result
}
