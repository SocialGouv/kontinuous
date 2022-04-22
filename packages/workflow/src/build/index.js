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
    KW_NO_TREE: options.noTree,
    HELM_ARGS: options.A || process.env.HELM_ARGS,

    KUBEWORKFLOW_PATH: path.resolve(`${__dirname}/../..`),
    WORKSPACE_PATH: cwd,
    KWBUILD_PATH:
      process.env.KWBUILD_PATH ||
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
        language: "yaml",
        theme,
      })
    }
    process.stdout.write(m)
  } else {
    logger.info(`Built manifests file: ${manifestsFile}`)
  }
  
  const uploadUrl = options.upload || process.env.KUBEWORKFLOW_BUILD_UPLOAD_URL
  if(uploadUrl){
    await upload({ uploadUrl, manifests })
  }

  return result
}
