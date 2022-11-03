const os = require("os")

const fs = require("fs-extra")
const decompress = require("decompress")

const needBin = require("./need-bin")
const downloadFile = require("./download-file")

const helmVersion = process.env.HELM_VERSION || "v3.9.3"

const download = async (options) => {
  const { logger } = options

  const { cacheDir } = options

  let arch = os.arch()
  switch (arch) {
    case "x64":
      arch = "amd64"
      break
    default:
  }
  let platform = os.platform()
  let ext = ""
  switch (platform) {
    case "darwin":
      break
    case "windows":
      ext = ".exe"
      break
    case "linux":
      break
    default:
      platform = "linux"
  }

  const fileName = `helm-${helmVersion}-${platform}-${arch}.tar.gz`

  const cachePath = `${cacheDir}/bin`
  await fs.ensureDir(cachePath)
  const zfile = `${cachePath}/${fileName}`

  if (!(await fs.pathExists(zfile))) {
    const downloadUrl = `https://get.helm.sh/${fileName}`
    logger.info(`download ${downloadUrl}`)
    await downloadFile(downloadUrl, zfile, logger)
  }
  const { addPath } = options
  await decompress(zfile, cachePath)
  const unzippedDir = `${cachePath}/${platform}-${arch}`
  const unzippedHelm = `${unzippedDir}/helm${ext}`
  await fs.move(unzippedHelm, `${addPath}/helm`)
  await fs.remove(unzippedDir)
}

module.exports = (options = {}) =>
  needBin("helm", download, { ...options, version: helmVersion })
