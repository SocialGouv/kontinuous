const path = require("path")
const fs = require("fs-extra")

const yaml = require("js-yaml")

const getDirectories = require("../../action/build/utils/getDirectories")

const package = require(`${__dirname}/../../package.json`)

const logger = require("../../action/build/utils/logger")

const main = async ()=>{
  const { version } = package
  const chartsPath = path.resolve(`${__dirname}/..`)
  const charts = await getDirectories(chartsPath)
  await Promise.all(charts.map(async (chartName) => {
    if (chartName.startsWith(".")){
      return
    }
    const chartPath = `${chartsPath}/${chartName}/Chart.yaml`
    const chart = yaml.load(await fs.readFile(chartPath, {encoding: "utf-8"}))
    chart.appVersion = version
    chart.version = version
    const { dependencies } = chart
    if (dependencies) {
      for (const dependency of dependencies){
        if (dependency.repository.startsWith("file://./charts/")){
          dependency.version = version
        }
      }
    }
    await fs.writeFile(chartPath, yaml.dump(chart))
  }))
}

main()