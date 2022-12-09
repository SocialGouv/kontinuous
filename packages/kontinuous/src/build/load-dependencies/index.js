const fs = require("fs-extra")

const yaml = require("~common/utils/yaml")

const chartTools = require("./chart-tools")
const dependencies = require("./dependencies")
const mergeEnvTemplates = require("./merge-env-templates")
const compileValues = require("./compile-values")
const copyFilesDir = require("./copy-files-dir")

module.exports = async (config, logger) => {
  const { buildPath } = config

  await dependencies(config, logger)

  if (!config.ignoreProjectTemplates) {
    await mergeEnvTemplates(`${buildPath}/charts/project`, config)
  }
  if (config.ignoreProjectTemplates) {
    await fs.remove(`${buildPath}/charts/project/templates`)
  }
  await copyFilesDir(config)
  const values = await compileValues(config, logger)

  const valuesDump = yaml.dump(values)

  await Promise.all([
    chartTools.buildChartFile(buildPath, "kontinuous-umbrella"),
    fs.writeFile(`${buildPath}/values.yaml`, valuesDump),
  ])

  await fs.writeFile(
    `${buildPath}/.helmignore`,
    ["node_modules", ".yarn"].join("\n")
  )

  return { values, valuesDump }
}
