const path = require("path")

const fs = require("fs-extra")
const camelCase = require("lodash.camelcase")

const configDependencyKey = require("~common/utils/config-dependency-key")

module.exports = async (target, type, definition) => {
  const jsFile = `${target}/${type}/index.js`
  if (await fs.pathExists(jsFile)) {
    return
  }
  const processors = []

  const { dependencies = {} } = definition
  for (const name of Object.keys(dependencies)) {
    const indexFile = `../charts/${name}/${type}`
    processors.push(indexFile)
  }

  const typeKey = camelCase(type)
  let loads = definition[typeKey] || {}
  const typeDir = `${target}/${type}`

  const exts = [".js", ".ts"]
  if (await fs.pathExists(typeDir)) {
    const paths = await fs.readdir(typeDir)
    for (const p of paths) {
      let key
      if ((await fs.stat(`${typeDir}/${p}`)).isDirectory()) {
        if (!(await fs.pathExists(`${typeDir}/${p}/index.js`))) {
          continue
        }
        key = p
      } else {
        const ext = path.extname(p)
        if (!exts.includes(ext)) {
          continue
        }
        key = p.substring(0, p.length - ext.length)
      }
      key = configDependencyKey(key)
      if (!loads[key]) {
        loads[key] = {}
      }
      loads[key].require = `./${p}`
    }
  }

  loads = Object.entries(loads)
    .filter(([_key, value]) => value.enabled !== false)
    .reduce((acc, [key, value]) => {
      acc[key] = value
      return acc
    }, {})

  for (const [name, load] of Object.entries(loads)) {
    let { require: req } = load
    if (!req) {
      req = `./${name}`
    }
    processors.push(req)
  }

  processors.sort()

  const jsSrc = `module.exports = [${processors
    .map((p) => JSON.stringify(p))
    .join(",")}]`
  await fs.ensureDir(path.dirname(jsFile))
  await fs.writeFile(jsFile, jsSrc)
}
