const { highlight, fromJson: themeFromJson } = require("cli-highlight")

const logger = require("~common/utils/logger")

const builder = require("./builder")

const upload = require("~/upload")
const ctx = require("~/ctx")

module.exports = async (options) => {
  const config = ctx.require("config")

  logger.info(`Build path file://${config.buildPath}`)

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
    logger.info(`Built manifests file://${manifestsFile}`)
  }
  
  const uploadUrl = config.uploadUrl
  if(uploadUrl){
    await upload({ uploadUrl, manifests })
  }

  return result
}
