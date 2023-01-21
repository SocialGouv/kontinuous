const fs = require("fs-extra")
const yaml = require("~common/utils/yaml")
const createChart = require("~common/utils/create-chart")
const configDependencyKey = require("~common/utils/config-dependency-key")

const chartTools = require("./index")

module.exports = async (target, name, definition = {}) => {
  const chartFile = `${target}/Chart.yaml`
  const chart = createChart(name)
  if (await fs.pathExists(chartFile)) {
    const extendChart = yaml.load(await fs.readFile(chartFile))
    Object.assign(chart, extendChart)
    chart.name = name
  }

  await chartTools.registerSubcharts(chart, "charts", target, definition)

  chart.dependencies = chart.dependencies.filter(
    (dep) =>
      definition.charts?.[configDependencyKey(dep.name)]?.enabled !== false
  )

  await fs.ensureDir(target)
  await fs.writeFile(chartFile, yaml.dump(chart))
}
