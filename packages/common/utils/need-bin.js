const path = require("path")
const os = require("os")

const fs = require("fs-extra")

const which = require("which")

const globalLogger = require("./logger")

const findableBin = async (bin, envPath) => {
  try {
    const p = await which(bin, { path: envPath })
    return !!p
  } catch (err) {
    return false
  }
}

module.exports = async (bin, downloadFunc, options = {}) => {
  if (!options.logger) {
    options.logger = globalLogger
  }
  if (!options.addPath) {
    options.addPath = `${os.homedir()}/.node-need-bin`
  }
  if (!options.cacheDir) {
    options.cacheDir = path.join(os.tmpdir(), "node-need-bin")
  }
  const { addPath } = options
  let { envPath = process.env.PATH } = options
  await fs.ensureDir(addPath)
  const envPaths = envPath.split(path.delimiter)
  if (!envPaths.includes(addPath)) {
    envPaths.push(addPath)
    envPath = envPaths.join(path.delimiter)
    if (!options.noSetEnv) {
      process.env.PATH = envPath
    }
    options.envPath = envPath
  }
  if (!(await findableBin(bin, envPath))) {
    await downloadFunc(options)
  }
  if (!(await findableBin(bin, envPath))) {
    throw Error(`unable to locate required executable: ${bin}`)
  }
}
