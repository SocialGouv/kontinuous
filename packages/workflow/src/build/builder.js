const os = require("os")
const path = require("path")
const { mkdtemp } = require("fs/promises")
const fs = require("fs-extra")
const yaml = require("js-yaml")
const defautlsDeep = require("lodash.defaultsdeep")

const asyncShell = require("~/utils/async-shell")

const globalLogger = require("~/utils/logger")
const getEnv = require("~/env")
const generateValues = require("./values")
const compileJobs = require("./compile-jobs")
const compileOutputs = require("./compile-outputs")
const compileChart = require("./compile-chart")
const compiledefaultNs = require("./compile-default-ns")

const { buildCtx } = require("./ctx")

module.exports = async (envVars) => {
  buildCtx.provide()
  asyncShell.ctx.provide()

  if (!envVars) {
    envVars = getEnv()
  }
  buildCtx.set("env", envVars)

  for (const requiredEnv of [
    "KUBEWORKFLOW_PATH",
    "WORKSPACE_PATH",
    "ENVIRONMENT",
  ]) {
    if (!envVars[requiredEnv]) {
      throw new Error(`Missing mandatory var "${requiredEnv}"`)
    }
  }

  if (!envVars.KWBUILD_PATH) {
    envVars.KWBUILD_PATH = await mkdtemp(
      path.join(os.tmpdir(), `kube-workflow`)
    )
  }

  const {
    KWBUILD_PATH,
    KUBEWORKFLOW_PATH,
    ENVIRONMENT,
    WORKSPACE_PATH,
    WORKSPACE_SUBPATH = "/.kube-workflow",
    COMPONENTS,
    HELM_ARGS = "",
  } = envVars

  const logger = globalLogger.child({ KWBUILD_PATH, WORKSPACE_PATH })
  buildCtx.set("logger", logger)
  asyncShell.ctx.set("logger", logger)

  await fs.ensureDir(KWBUILD_PATH)

  logger.debug("Import charts")
  await fs.copy(`${KUBEWORKFLOW_PATH}/chart`, `${KWBUILD_PATH}/chart`, {
    dereference: true,
  })

  const workspaceKubeworkflowPath = `${WORKSPACE_PATH}${WORKSPACE_SUBPATH}`
  if (await fs.pathExists(workspaceKubeworkflowPath)) {
    await fs.copy(`${workspaceKubeworkflowPath}`, `${KWBUILD_PATH}`, {
      dereference: true,
    })
  }

  logger.debug("Generate values file")
  const getValuesFile = async (...files) => {
    for (const file of files) {
      for (const filePath of [
        `${KWBUILD_PATH}/${file}.yaml`,
        `${KWBUILD_PATH}/${file}.yml`,
      ]) {
        if (await fs.pathExists(filePath)) {
          return yaml.load(await fs.readFile(filePath, { encoding: "utf-8" }))
        }
      }
    }
    return null
  }
  const defaultValues = generateValues()
  const [commonValues, envValues] = await Promise.all([
    getValuesFile("values", "common/values"),
    getValuesFile(`${ENVIRONMENT}/values`, `env/${ENVIRONMENT}/values`),
  ])
  const values = defautlsDeep({}, envValues, commonValues, defaultValues)

  logger.debug("Compiling jobs")
  await compileJobs(values)

  logger.debug("Compiling outputs")
  await compileOutputs(values)

  logger.debug("Compiling additional subcharts instances")
  const chart = await compileChart(values)

  logger.debug("Merge .kube-workflow templates")
  for (const dir of ["templates", "common/templates"]) {
    const templatesDir = `${KWBUILD_PATH}/${dir}`
    if (await fs.pathExists(templatesDir)) {
      await fs.copy(templatesDir, `${KWBUILD_PATH}/templates`, {
        dereference: true,
      })
    }
  }
  for (const dir of [
    `${ENVIRONMENT}/templates`,
    `env/${ENVIRONMENT}/templates`,
  ]) {
    const templatesDir = `${KWBUILD_PATH}/${dir}`
    if (await fs.pathExists(templatesDir)) {
      await fs.copy(templatesDir, `${KWBUILD_PATH}/templates`, {
        dereference: true,
      })
    }
  }

  logger.debug(`Import template in kube-workflow chart`)
  if (await fs.pathExists(`${KWBUILD_PATH}/templates`)) {
    await fs.copy(
      `${KWBUILD_PATH}/templates`,
      `${KWBUILD_PATH}/chart/templates`
    )
  }

  if (COMPONENTS) {
    logger.debug(`Enable only components: "${COMPONENTS}"`)
    const components = COMPONENTS.split(" ")
    for (const key of Object.keys(chart.dependencies)) {
      values[key].enabled = components.includes(key)
    }
  }

  logger.debug("Write values file")
  await fs.writeFile(`${KWBUILD_PATH}/values.json`, JSON.stringify(values))

  logger.debug("Build base manifest using helm")
  let manifests = await asyncShell(
    `
      helm template
        -f values.json
        --post-renderer ${KUBEWORKFLOW_PATH}/bin/post-renderer
        ${HELM_ARGS}
        chart
    `,
    { cwd: KWBUILD_PATH }
  )

  logger.debug("Set default namespace")
  manifests = await compiledefaultNs(manifests, values)

  logger.debug("Write manifests file")
  const manifestsFile = `${KWBUILD_PATH}/manifests.yaml`
  await fs.writeFile(manifestsFile, manifests)

  logger.debug(`Built manifests: ${manifestsFile}`)

  return {
    manifestsFile,
    manifests,
    values,
  }
}
