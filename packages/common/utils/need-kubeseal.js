const os = require("os")

const fs = require("fs-extra")
const decompress = require("decompress")

const versions = require("../versions")

const needBin = require("./need-bin")
const downloadFile = require("./download-file")

const kubesealVersion = process.env.KUBESEAL_VERSION || versions.kubeseal

const download = async (options) => {
  const { logger } = options

  let arch = os.arch()
  let ext = ""
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
    case "win32":
      ext = ".exe"
      throw new Error(
        "kubeseal doesn't have a cli package for windows actually, see https://github.com/bitnami-labs/sealed-secrets/issues/105"
      )
    case "linux":
      break
    default:
      platform = "linux"
  }

  const fileName = `kubeseal-${kubesealVersion}-${platform}-${arch}.tar.gz`

  const { cacheDir } = options

  const cachePath = `${cacheDir}/bin`
  await fs.ensureDir(cachePath)
  const zfile = `${cachePath}/${fileName}`

  if (!(await fs.pathExists(zfile))) {
    const downloadUrl = `https://github.com/bitnami-labs/sealed-secrets/releases/download/v${kubesealVersion}/${fileName}`
    logger.info(`⬇️  downloading ${downloadUrl}`)
    await downloadFile(downloadUrl, zfile, logger)
  }
  const { addPath } = options
  await decompress(zfile, cachePath)
  const unzippedDir = `${cachePath}/${platform}-${arch}`
  const unzippedHelm = `${unzippedDir}/kubeseal${ext}`
  await fs.move(unzippedHelm, `${addPath}/kubeseal`)
  await fs.remove(unzippedDir)
}

module.exports = (options = {}) =>
  needBin("kubectl", download, { ...options, version: kubesealVersion })
