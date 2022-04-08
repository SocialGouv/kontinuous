const fs = require("fs-extra")
const yaml = require("js-yaml")
const getDirectories = require("~/utils/get-directories")

const { buildCtx } = require("./ctx")

const defaultChart = (name, umbrellaChart)=>{
  const { apiVersion, appVersion, version } = umbrellaChart
  return {
    apiVersion,
    version,
    appVersion,
    name,
  }
}

module.exports = async (values) => {
  const { KWBUILD_PATH: rootDir } = buildCtx.require("env")
  const chart = yaml.load(
    await fs.readFile(`${rootDir}/Chart.yaml`, {
      encoding: "utf-8",
    })
  )

  const { dependencies } = chart

  // import subcharts from project
  const allChartNames = await getDirectories(`${rootDir}/charts`)
  for (const c of allChartNames){
    const chartDir = `${rootDir}/charts/${c}`
    const chartFile = `${chartDir}/Chart.yaml`
    if(!(await fs.pathExists(chartFile))){
      await fs.writeFile(chartFile, yaml.dump(defaultChart(c, chart)))
    }
    const subchart = yaml.load(await fs.readFile(chartFile))
    if (!dependencies.find(dependency => dependency.name === subchart.name)){
      dependencies.push({
        name: subchart.name,
        repository: `file://./charts/${c}`,
        condition: `${subchart.name}.enabled`,
        version: subchart.version,
      })
    }
  }
  
  // compile extra instances from values
  const dependenciesByName = dependencies.reduce((acc, value) => {
    acc[value.name] = value
    return acc
  }, {})

  const componentKeys = Object.keys(values)

  for (const { name } of [...dependencies]) {
    for (const componentKey of componentKeys) {
      const isAnInstanceOf = componentKey.startsWith(`${name}-`)

      // create subcharts alias for components instances
      if (isAnInstanceOf) {
        dependencies.push({
          ...dependenciesByName[name],
          alias: componentKey,
          condition: `${componentKey}.enabled`,
        })
      }

      // enable common extra features for used components
      if (
        (componentKey === name || isAnInstanceOf) &&
        values.global.extra[name]
      ) {
        values.global.extra[name].enabled = true
      }
    }
  }
  await fs.writeFile(`${rootDir}/Chart.yaml`, yaml.dump(chart))

  return chart
}
