const os = require("os")
const path = require("path")
const { mkdtemp } = require("fs/promises")
const fs = require("fs-extra")

const { highlight, fromJson: themeFromJson } = require("cli-highlight")

const logger = require("~common/utils/logger")

const getGitInfos = require("~common/utils/get-git-infos")
const selectEnv = require("~common/utils/select-env")
const builder = require("./builder")

module.exports = async (options) => {
  const cwd = options.cwd || process.cwd()

  const { GIT_REF, GIT_SHA, GIT_REPOSITORY } = getGitInfos(cwd)

  const selectedEnv = selectEnv({ options, cwd })

  const envVars = {
    ...process.env,
    ENVIRONMENT: selectedEnv,
    KW_CHARTS: options.charts || process.env.KW_CHARTS,
    KW_SUBCHARTS: options.subcharts || process.env.KW_SUBCHARTS,
    KW_NO_TREE: options.noTree,
    HELM_ARGS: options.A || process.env.HELM_ARGS,

    GIT_REF,
    GIT_SHA,

    KUBEWORKFLOW_PATH: path.resolve(`${__dirname}/../..`),
    WORKSPACE_PATH: cwd,
    GIT_REPOSITORY,
    KWBUILD_PATH:
      process.env.KWBUILD_PATH ||
      (await mkdtemp(path.join(os.tmpdir(), `kube-workflow`))),
  }

  const result = await builder(envVars)

  const { manifestsFile } = result

  if (options.O) {
    let manifests = await fs.readFile(manifestsFile, { encoding: "utf-8" })
    if (options.S) {
      const theme = themeFromJson({
        keyword: "blue",
        built_in: ["cyan", "dim"],
        string: "green",
        default: "gray",
      })
      manifests = highlight(manifests, {
        language: "yaml",
        theme,
      })
    }
    process.stdout.write(manifests)
  } else {
    logger.info(`Built manifests files: ${manifestsFile}`)
  }

  return result
}
