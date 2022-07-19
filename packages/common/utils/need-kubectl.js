const os = require("os")

const fs = require("fs-extra")

const needBin = require("./need-bin")
const downloadFile = require("./download-file")

const kubectlVersion = process.env.KUBECTL_VERSION || "v1.23.4"

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

  const downloadUrl = `https://dl.k8s.io/release/${kubectlVersion}/bin/${platform}/${arch}/kubectl`
  logger.info(`download ${downloadUrl}`)
  const dest = `${addPath}/kubectl`
  await downloadFile(downloadUrl, dest)
  await fs.chmod(dest, 0o755)
}

module.exports = (options = {}) => needBin("kubectl", download, options)
