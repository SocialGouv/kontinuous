const os = require("os")

const fs = require("fs-extra")
const decompress = require("decompress")

const versions = require("../versions")

const needBin = require("./need-bin")
const downloadFile = require("./download-file")

const kubeconformVersion =
  process.env.KUBECONFORM_VERSION || versions.kubeconform

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

  const fileName = `kubeconform-${platform}-${arch}.tar.gz`

  const cachePath = `${cacheDir}/bin`
  await fs.ensureDir(cachePath)
  const zfile = `${cachePath}/${fileName}`

  if (!(await fs.pathExists(zfile))) {
    const downloadUrl = `https://github.com/yannh/kubeconform/releases/download/v${kubeconformVersion}/${fileName}`
    logger.info(`⬇️  downloading ${downloadUrl}`)
    await downloadFile(downloadUrl, zfile, logger)
  }
  const { addPath } = options
  const unzippedDir = `${cachePath}/kubeconform`
  await fs.ensureDir(unzippedDir)
  await decompress(zfile, unzippedDir)
  const unzippedKubeconform = `${unzippedDir}/kubeconform${ext}`
  await fs.move(unzippedKubeconform, `${addPath}/kubeconform`)
  await fs.remove(unzippedDir)
}

module.exports = (options = {}) =>
  needBin("kubeconform", download, { ...options, version: kubeconformVersion })
