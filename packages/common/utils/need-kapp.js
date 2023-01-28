const os = require("os")

const fs = require("fs-extra")

const versions = require("../versions")

const needBin = require("./need-bin")
const downloadFile = require("./download-file")

const kappVersion = process.env.KAPP_VERSION || versions.kapp

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

  const downloadUrl = `https://github.com/vmware-tanzu/carvel-kapp/releases/download/v${kappVersion}/kapp-${platform}-${arch}${ext}`
  logger.info(`⬇️  downloading ${downloadUrl}`)
  const dest = `${addPath}/kapp`
  await downloadFile(downloadUrl, dest, logger)
  await fs.chmod(dest, 0o755)
}

module.exports = (options = {}) =>
  needBin("kapp", download, { ...options, version: kappVersion })
