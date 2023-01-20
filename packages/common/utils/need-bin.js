const path = require("path")
const os = require("os")

const fs = require("fs-extra")

const which = require("which")

const getLogger = require("./get-logger")

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
    options.logger = getLogger()
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
    envPaths.unshift(addPath)
    envPath = envPaths.join(path.delimiter)
    if (!options.noSetEnv) {
      process.env.PATH = envPath
    }
    options.envPath = envPath
  }

  if (!options.forceDownload && (await findableBin(bin, envPath))) {
    return
  }

  const binFile = `${addPath}/${bin}`
  const versionFile = `${binFile}.version`
  const { version } = options
  let hasToDownload

  if ((await fs.pathExists(versionFile)) && (await fs.pathExists(binFile))) {
    const currentVersion = await fs.readFile(versionFile, { encoding: "utf-8" })
    hasToDownload = currentVersion !== version
  } else {
    hasToDownload = true
  }

  if (hasToDownload) {
    await fs.remove(binFile)
    await downloadFunc(options)
    await fs.writeFile(versionFile, version)
  }

  if (!(await findableBin(bin, envPath))) {
    throw Error(`unable to locate required executable: ${bin}`)
  }
}
