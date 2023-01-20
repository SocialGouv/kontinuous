const os = require("os")

const fs = require("fs-extra")
const decompress = require("decompress")

const needBin = require("./need-bin")
const downloadFile = require("./download-file")

const sternVersion = process.env.STERN_VERSION || "1.22.0"

const download = async (options) => {
  const { logger } = options

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

  const { addPath, cacheDir } = options

  const fileName = `stern_${sternVersion}_${platform}_${arch}.tar.gz`

  const cachePath = `${cacheDir}/bin`
  const unzipTarget = `${cachePath}/stern`
  await fs.ensureDir(unzipTarget)
  const zfile = `${cachePath}/${fileName}`

  if (!(await fs.pathExists(zfile))) {
    const downloadUrl = `https://github.com/stern/stern/releases/download/v${sternVersion}/${fileName}`
    logger.info(`⬇️  downloading ${downloadUrl}`)
    await downloadFile(downloadUrl, zfile, logger)
  }

  await decompress(zfile, unzipTarget)
  const unzippedStern = `${unzipTarget}/stern${ext}`
  const dest = `${addPath}/stern`
  await fs.move(unzippedStern, dest)
  await fs.chmod(dest, 0o755)
  await fs.remove(unzipTarget)
}

module.exports = (options = {}) =>
  needBin("stern", download, { ...options, version: sternVersion })
