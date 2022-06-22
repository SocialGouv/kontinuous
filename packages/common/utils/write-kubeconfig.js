const path = require("path")
const os = require("os")
const { mkdtemp } = require("fs/promises")
const fs = require("fs-extra")
const mergeWith = require("lodash.mergewith")
const yaml = require("./yaml")

const configMergeKeys = ["clusters", "users", "contexts"]

module.exports = async (
  kubeconfigVarNames = ["KUBECONFIG"],
  kubeconfig = {},
  dest = null
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
    if (!dest) {
      const tmpDir = await mkdtemp(path.join(os.tmpdir(), `kontinuous`))
      dest = `${tmpDir}/.kubeconfig`
    } else {
      await fs.ensureDir(path.dirname(dest))
    }
    await fs.writeFile(dest, yaml.dump(kubeconfig))
    await fs.chmod(dest, 0o400)
    process.env.KUBECONFIG = dest
  }
  return process.env.KUBECONFIG
}
