const os = require("os")

const fs = require("fs-extra")

const needBin = require("./need-bin")
const downloadFile = require("./download-file")

const kappVersion = process.env.KAPP_VERSION || "v0.49.0"

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
  switch (platform) {
    case "darwin":
      break
    case "windows":
      break
    case "linux":
      break
    default:
      platform = "linux"
  }

  const { addPath } = options

  const downloadUrl = `https://github.com/vmware-tanzu/carvel-kapp/releases/download/${kappVersion}/kapp-${platform}-${arch}`
  logger.info(`download ${downloadUrl}`)
  const dest = `${addPath}/kapp`
  await downloadFile(downloadUrl, dest)
  await fs.chmod(dest, 0o755)
}

module.exports = (options = {}) => needBin("kapp", download, options)
