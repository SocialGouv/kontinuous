const childProcess = require("child_process")
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
        language: "yaml",
        theme,
      })
    }
    process.stdout.write(m)
  } else {
    logger.info(`📦 manifests: file://${manifestsFile} `)
  }

  if (config.upload) {
    await upload({ file: manifestsFile })
  }

  if (options.open) {
    const launchSupportedEditors = [
      // without all terminal editors that doesn't really work
      "appcode",
      "atom",
      "atom-beta",
      "brackets",
      "clion",
      "code",
      "code-insiders",
      "codium",
      "idea",
      "notepad++",
      "pycharm",
      "phpstorm",
      "rubymine",
      "sublime",
      "visualstudio",
      "webstorm",
    ]

    if (!config.editor || launchSupportedEditors.includes(config.editor)) {
      launch(manifestsFile, config.editor)
    } else {
      childProcess.spawnSync(config.editor, [manifestsFile], {
        stdio: "inherit",
      })
    }
  }

  return result
}
