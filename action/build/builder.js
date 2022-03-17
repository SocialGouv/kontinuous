const os = require("os")
const path = require("path")
const { mkdtemp } = require('fs/promises');
const fs = require("fs-extra")
const yaml = require("js-yaml")
const defautlsDeep = require("lodash.defaultsdeep")

const shell = require("./utils/shell")

const generateValues = require("./values")
const compileUses = require("./compile-uses")
const compileChart = require("./compile-chart")
const compiledefaultNs = require("./compile-default-ns")
const getEnv = require("./env")

const logger = require("./logger")

module.exports = async (envVars) => {

  if (!envVars){
    envVars = getEnv()
  }

  for (const requiredEnv of ["KUBEWORKFLOW_PATH", "WORKSPACE_PATH", "ENVIRONMENT"]){
    if (!envVars[requiredEnv]){
      throw new Error(`Missing mandatory var "${requiredEnv}"`)
    }
  }
  
  const {
    KUBEWORKFLOW_PATH,
    ENVIRONMENT,
    WORKSPACE_PATH,
  } = envVars

  let { KWBUILD_PATH } = envVars
  if(!KWBUILD_PATH){
    KWBUILD_PATH = await mkdtemp(path.join(os.tmpdir(), `kube-workflow`));
  }

  fs.ensureDirSync(KWBUILD_PATH)
  process.chdir(KWBUILD_PATH)
  
  logger.debug("Prepare charts and overlays")
  fs.copySync(`${KUBEWORKFLOW_PATH}/chart`, ".")
  
  if (fs.existsSync(`${WORKSPACE_PATH}/.kube-workflow`)){
    fs.copySync(`${WORKSPACE_PATH}/.kube-workflow`, ".", {dereference: true})
  }
  
  logger.debug("Generate values file")
  const getValuesFile = (file)=>{
    for(const filePath of [
      `${file}.yaml`,
      `${file}.yml`
    ]){
      if (fs.existsSync(filePath)) {
        return yaml.load(fs.readFileSync(filePath))
      }
    }
  }
  const defaultValues = generateValues(envVars)
  const commonValues = getValuesFile("common/values")
  const envValues = getValuesFile(`env/${ENVIRONMENT}/values`)
  const values = defautlsDeep({}, envValues, commonValues, defaultValues)

  logger.debug("Compiling composite uses")
  await compileUses({ values })
  
  logger.debug("Compiling additional subcharts instances")
  const chart = compileChart(values)
  
  
  logger.debug("Merge .kube-workflow env templates")
  const envTemplatesDir = `${KWBUILD_PATH}/env/${ENVIRONMENT}/templates`
  if(await fs.pathExists(envTemplatesDir)){
    await fs.copy(envTemplatesDir, "templates", { dereference: true })
  }
  
  
  const { COMPONENTS } = envVars
  if (COMPONENTS){
    const components = COMPONENTS.split(" ")
    for (const key of Object.keys(chart.dependencies)){
      values[key].enabled = components.includes(key)
    }
  }
  
  logger.debug("Write values file")
  fs.writeFileSync("values.json", JSON.stringify(values))
  
  logger.debug("Build base manifest using helm")
  const { HELM_ARGS = "" } = envVars
  let baseManifests = shell(`helm template -f values.json ${HELM_ARGS} .`)
  
  logger.debug("Set default namespace")
  baseManifests = await compiledefaultNs(baseManifests, values)
  
  logger.debug("Write base manifests file")
  fs.writeFileSync("manifests.base.yaml", baseManifests)
  
  logger.debug("Build final manifests using kustomize")
  const manifests = shell(`kustomize build --load-restrictor=LoadRestrictionsNone "env/${ENVIRONMENT}"`)
  
  logger.debug("Write final manifests file")
  fs.writeFileSync("manifests.yaml", manifests)
  
  logger.debug("Built manifests: $PWD/manifests.yaml")
}
