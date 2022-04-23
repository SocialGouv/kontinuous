const path = require("path")
const os = require("os")
const { mkdtemp } = require("fs/promises")
const fs = require("fs-extra")
const yaml = require("js-yaml")
const mergeWith = require("lodash.mergewith")

const configMergeKeys = ["clusters", "users", "contexts"]

module.exports = async (
  kubeconfigVarNames = ["KUBECONFIG"],
  kubeconfig = {}
) => {
  let found

  const configMergeMap = configMergeKeys.reduce((acc, key) => {
    acc[key] = {}
    return acc
  }, {})
  const configMergeToMap = (key, value) => {
    if (!value) {
      return
    }
    for (const item of value) {
      if (!item) {
        continue
      }
      configMergeMap[key][item.name] = item
    }
  }

  for (const kubeconfigVarName of kubeconfigVarNames) {
    if (
      process.env[kubeconfigVarName] &&
      process.env[kubeconfigVarName].includes("\n")
    ) {
      found = true
      const config = yaml.load(process.env[kubeconfigVarName])
      mergeWith(kubeconfig, config, (oValue, srcValue, key) => {
        if (configMergeKeys.includes(key)) {
          configMergeToMap(key, oValue)
          configMergeToMap(key, srcValue)
          return Object.values(configMergeMap[key])
        }
      })
    }
  }

  if (found) {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), `kube-workflow`))
    const kubeconfigFile = `${tmpDir}/.kubeconfig`
    await fs.writeFile(kubeconfigFile, yaml.dump(kubeconfig))
    process.env.KUBECONFIG = kubeconfigFile
  }
}
