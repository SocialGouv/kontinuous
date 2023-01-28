const os = require("os")

const fs = require("fs-extra")

const versions = require("../versions")

const needBin = require("./need-bin")
const downloadFile = require("./download-file")

const kubectlVersion = process.env.KUBECTL_VERSION || versions.kubectl

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

  const downloadUrl = `https://dl.k8s.io/release/v${kubectlVersion}/bin/${platform}/${arch}/kubectl${ext}`
  logger.info(`⬇️  downloading ${downloadUrl}`)
  const dest = `${addPath}/kubectl`
  await downloadFile(downloadUrl, dest, logger)
  await fs.chmod(dest, 0o755)
}

module.exports = (options = {}) =>
  needBin("kubectl", download, { ...options, version: kubectlVersion })
