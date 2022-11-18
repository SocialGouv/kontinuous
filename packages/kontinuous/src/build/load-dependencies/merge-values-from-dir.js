const fs = require("fs-extra")
const get = require("lodash.get")
const set = require("lodash.set")

const yaml = require("~common/utils/yaml")
const deepmerge = require("~common/utils/deepmerge")
const beforeMergeChartValues = require("./before-merge-chart-values")
const mergeYamlFileValues = require("./merge-yaml-file-values")
const mergeEnvTemplates = require("./merge-env-templates")

const mergeValuesFromDir = async ({
  values,
  target,
  definition,
  scope,
  config,
}) => {
  const { environment } = config

  const chartsPath = `${target}/charts`
  if (!(await fs.pathExists(chartsPath))) {
    return
  }
  const chart = yaml.load(
    await fs.readFile(`${target}/Chart.yaml`, { encoding: "utf-8" })
  )
  const { dependencies = [] } = chart

  const chartDirs = await fs.readdir(chartsPath)
  for (const subchartDir of chartDirs) {
    const subchartDirPath = `${chartsPath}/${subchartDir}`
    if (!(await fs.stat(subchartDirPath)).isDirectory()) {
      continue
    }

    const subchartScopes = []
    for (const dep of dependencies) {
      if (dep.name === subchartDir) {
        subchartScopes.push([...scope, dep.alias || dep.name])
      }
    }

    for (const subchartScope of subchartScopes) {
      const dotKey = subchartScope.join(".")
      let subValues = get(values, dotKey)
      if (!subValues) {
        subValues = {}
        set(values, dotKey, subValues)
      }

      await mergeValuesFromDir({
        values,
        target: subchartDirPath,
        definition: definition[subchartDir] || {},
        scope: subchartScope,
        config,
      })

      await mergeYamlFileValues(
        `${subchartDirPath}/values`,
        subValues,
        beforeMergeChartValues
      )

      await mergeYamlFileValues(
        `${subchartDirPath}/env/${environment}/values`,
        subValues,
        beforeMergeChartValues
      )

      await mergeEnvTemplates(subchartDirPath, config)

      if (definition.values) {
        deepmerge(subValues, definition.values)
      }
    }
  }
}
module.exports = mergeValuesFromDir
