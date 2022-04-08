const fs = require("fs-extra")
const yaml = require("js-yaml")
const mergeWith = require("lodash.mergewith")

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

const defaultValues = (_name, _umbrellaChart) => {
  return {
    enabled: false
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
    
    // default Chart file
    const chartFile = `${chartDir}/Chart.yaml`
    if(!(await fs.pathExists(chartFile))){
      await fs.writeFile(chartFile, yaml.dump(defaultChart(c, chart)))
    }
    
    // default values files with minimum
    const valuesFiles = [`${chartDir}/values.yaml`, `${chartDir}/values.yml`]
    let valuesFile
    for (const f of valuesFiles){
      if (await fs.pathExists(f)){
        valuesFile = f
        break
      }
    }
    let values
    if (!valuesFile){
      [valuesFile] = valuesFiles
      values = {}
    } else {
      values = yaml.load(await fs.readFile(valuesFile))
    }
    const defaultValuesObj = mergeWith(values, defaultValues(c, chart), (objValue, srcValue) => {
      if (Array.isArray(objValue)) {
        return srcValue;
      }
    })
    await fs.writeFile(valuesFile, yaml.dump(defaultValuesObj))
    
    // import subcharts in umbrella chart dependencies
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
