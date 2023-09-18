const fs = require("fs-extra")

const getYamlPath = require("~common/utils/get-yaml-path")
const ctx = require("~common/ctx")

const createContext = require("~/plugins/context")
const pluginFunction = require("~/plugins/context/function")

const valuesEnableStandaloneCharts = require("./values-enable-standalone-charts")
const beforeMergeProjectValues = require("./before-merge-project-values")
// const cleanMetaValues = require("./clean-meta-values")
const removeNotEnabledValues = require("./remove-not-enabled-values")
const mergeYamlFileValues = require("./merge-yaml-file-values")
const writeChartsAlias = require("./write-charts-alias")
const valuesOverride = require("./values-override")
const mergeValuesFromDir = require("./merge-values-from-dir")

module.exports = async (config, logger) => {
  const abortSignal = ctx.require("abortSignal")
  abortSignal.throwIfAborted()

  logger.info("🌀 [LIFECYCLE]: values-compilers")

  let values = {}
  const { buildPath, environment } = config

  const buildProjectPath = `${buildPath}/charts/project`

  const scope = ["project"]

  logger.debug("🪡  [STEP]: merge env values")
  await mergeValuesFromDir({
    values,
    target: buildProjectPath,
    definition: config,
    scope,
    config,
  })

  await mergeYamlFileValues(
    `${buildProjectPath}/values`,
    values,
    beforeMergeProjectValues
  )
  await mergeYamlFileValues(
    `${buildProjectPath}/env/${environment}/values`,
    values,
    beforeMergeProjectValues
  )

  if (!values.global) {
    values.global = {}
  }
  if (!values.global.kontinuous) {
    values.global.kontinuous = {}
  }

  valuesEnableStandaloneCharts(values, config)

  valuesOverride(values, config, logger)

  const chartsAliasMap = new Map()
  const context = createContext({ type: "values-compilers", chartsAliasMap })

  const valuesJsFile = `${buildProjectPath}/values.js`
  logger.debug("🪡  [STEP]: values.js")
  if (await fs.pathExists(valuesJsFile)) {
    values = await pluginFunction(valuesJsFile)(values, {}, context)
  }

  logger.debug("🪡  [STEP]: values-compilers/*")
  values = await pluginFunction(`${buildProjectPath}/values-compilers`)(
    values,
    {},
    context
  )

  logger.debug("🪡  [STEP]: values.final.js")
  const valuesFinalJsFile = `${buildProjectPath}/values.final.js`
  if (await fs.pathExists(valuesFinalJsFile)) {
    values = await pluginFunction(valuesFinalJsFile)(values, {}, context)
  }

  await writeChartsAlias(chartsAliasMap, config)
  removeNotEnabledValues(values)
  // cleanMetaValues(values)

  const projectValuesFile = await getYamlPath(`${buildProjectPath}/values`)
  if (projectValuesFile) {
    await fs.unlink(projectValuesFile)
  }

  return values
}
