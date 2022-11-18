const fs = require("fs-extra")
const yaml = require("~common/utils/yaml")
const configDependencyKey = require("~common/utils/config-dependency-key")

const chartTools = require("./chart-tools")

module.exports = async (chart, chartsDirName, target, definition = {}) => {
  const chartsDir = `${target}/${chartsDirName}`
  if (!(await fs.pathExists(chartsDir))) {
    return
  }
  const chartDirs = await fs.readdir(chartsDir)
  for (const chartDir of chartDirs) {
    const chartDirPath = `${chartsDir}/${chartDir}`
    if (!(await fs.stat(chartDirPath)).isDirectory()) {
      continue
    }
    if (definition.charts?.[configDependencyKey(chartDir)]?.enabled === false) {
      await fs.remove(chartDirPath)
      continue
    }

    const subchartFile = `${chartDirPath}/Chart.yaml`
    if (!(await fs.pathExists(subchartFile))) {
      // eslint-disable-next-line no-use-before-define
      await chartTools.buildChartFile(
        chartDirPath,
        chartDir,
        definition[chartDir]
      )
    }
    const subchart = yaml.load(
      await fs.readFile(subchartFile, {
        encoding: "utf-8",
      })
    )
    const dependency = {
      name: subchart.name,
      version: subchart.version,
      repository: `file://./${chartsDirName}/${chartDir}`,
    }
    const definedDependencies = chart.dependencies.filter(
      (d) => d.name === subchart.name
    )
    if (definedDependencies.length > 0) {
      for (const definedDependency of definedDependencies) {
        Object.assign(definedDependency, dependency)
      }
    } else {
      chart.dependencies.push(dependency)
    }
    if (dependency.condition && dependency.alias !== dependency.name) {
      dependency.condition = dependency.condition.replaceAll(
        `${dependency.name}.enabled`,
        `${dependency.alias}.enabled`
      )
    }
  }
}
