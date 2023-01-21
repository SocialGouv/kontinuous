const fs = require("fs-extra")

const yaml = require("~common/utils/yaml")
const normalizeDegitUri = require("~common/utils/normalize-degit-uri")

const chartTools = require("helm-tree/chart-tools")
const downloadDependencyFromHelmRepo = require("./download-dependency-from-helm-repo")
const downloadDependencyFromGitRepo = require("./download-dependency-from-git-repo")

const downloadRemoteRepository = async ({
  target,
  definition,
  cachePath,
  logger,
}) => {
  const chartFile = `${target}/Chart.yaml`
  const chart = yaml.load(await fs.readFile(chartFile))
  const { dependencies = [] } = chart
  let touched = false
  for (const dependency of dependencies) {
    let { degit: degitUri } = dependency
    if (degitUri) {
      degitUri = normalizeDegitUri(degitUri)
    }
    const { repository } = dependency

    if (degitUri) {
      await downloadDependencyFromGitRepo({
        dependency,
        target,
        cachePath,
        logger,
      })
      touched = true
    } else if (repository.startsWith("file://../")) {
      const { name } = dependency
      const chartDir = `${target}/charts`
      await fs.ensureDir(chartDir)
      const subchartPath = `${chartDir}/${name}`
      if (!(await fs.pathExists(subchartPath))) {
        await fs.symlink(`../${repository.slice(7)}`, subchartPath)
      }
      dependency.repository = `file://./charts/${name}`
      touched = true
    } else if (!repository.startsWith("file://")) {
      await downloadDependencyFromHelmRepo({
        dependency,
        target,
        cachePath,
        logger,
      })
      touched = true
    }
  }

  if (touched) {
    await fs.writeFile(chartFile, yaml.dump(chart))
  }

  for (const dependency of dependencies) {
    const name = dependency.alias || dependency.name
    const subchartDir = `${target}/charts/${dependency.name}`
    const subDefinition = definition[name] || {}
    await chartTools.buildChartFile(subchartDir, name, subDefinition)
    await downloadRemoteRepository({
      target: subchartDir,
      definition: subDefinition,
      cachePath,
      logger,
    })
  }
}

module.exports = downloadRemoteRepository
