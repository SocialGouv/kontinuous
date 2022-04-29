const os = require("os")
const path = require("path")
const { mkdtemp } = require("fs/promises")

const { highlight, fromJson: themeFromJson } = require("cli-highlight")

const logger = require("~common/utils/logger")

const builder = require("./builder")

const upload = require("~/upload")

module.exports = async (options) => {
  const cwd = options.cwd || process.cwd()
  const envVars = {
    ...process.env,
    KW_CHARTS: options.charts || process.env.KW_CHARTS,
    KW_SUBCHARTS: options.subcharts || process.env.KW_SUBCHARTS,
    KW_DISPLAY_TREE: options.tree,
    KW_HELM_ARGS: options.A || process.env.KW_HELM_ARGS,
    KW_INLINE_VALUES: options.inlineValues || process.env.KW_INLINE_VALUES,

    KW_KUBEWORKFLOW_PATH: path.resolve(`${__dirname}/../..`),
    KW_WORKSPACE_PATH: cwd,
    KW_BUILD_PATH:
      process.env.KW_BUILD_PATH ||
      (await mkdtemp(path.join(os.tmpdir(), `kube-workflow`))),
  }
  const result = await builder(envVars, options)
  

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
    logger.info(`Built manifests file: ${manifestsFile}`)
  }
  
  const uploadUrl = options.upload || process.env.KW_BUILD_UPLOAD_URL
  if(uploadUrl){
    await upload({ uploadUrl, manifests })
  }

  return result
}
