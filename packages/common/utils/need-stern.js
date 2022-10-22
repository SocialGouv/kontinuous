const os = require("os")

const fs = require("fs-extra")

const needBin = require("./need-bin")
const downloadFile = require("./download-file")

const sternVersion = process.env.STERN_VERSION || "v1.11.0"

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

  const { addPath } = options

  const downloadUrl = `https://github.com/wercker/stern/releases/download/${sternVersion}/stern_${platform}_${arch}${ext}`
  logger.info(`download ${downloadUrl}`)
  const dest = `${addPath}/stern`
  await downloadFile(downloadUrl, dest, logger)
  await fs.chmod(dest, 0o755)
}

module.exports = (options = {}) => needBin("stern", download, options)
