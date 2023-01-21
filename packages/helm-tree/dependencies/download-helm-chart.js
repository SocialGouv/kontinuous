const fs = require("fs-extra")

const axios = require("~common/utils/axios-retry")
const yaml = require("~common/utils/yaml")
const downloadFile = require("~common/utils/download-file")
const slug = require("~common/utils/slug")
const handleAxiosError = require("~common/utils/handle-axios-error")

module.exports = async ({ dependency, target, cachePath, logger }) => {
  const { repository, version } = dependency
  const localArchive = `${target}/charts/${dependency.name}-${version}.tgz`
  let zfile
  if (await fs.pathExists(localArchive)) {
    zfile = localArchive
  } else {
    const archiveSlug = slug([dependency.name, version, repository])
    zfile = `${cachePath}/${archiveSlug}.tgz`
    if (!(await fs.pathExists(zfile))) {
      await fs.ensureDir(cachePath)
      const chartRepository = `${repository}/index.yaml`
      let repositoryIndex
      try {
        logger.debug(
          `⬇️  downloading chart repository index ${chartRepository}`
        )
        repositoryIndex = await axios.get(chartRepository)
      } catch (e) {
        handleAxiosError(e, logger)
        throw Error(`Unable to download ${chartRepository}: ${e.message}`)
      }
      const repo = yaml.load(repositoryIndex.data)
      const { entries } = repo
      const entryVersions = entries[dependency.name]
      const versionEntry = entryVersions.find(
        (entry) => entry.version.toString() === dependency.version.toString()
      )
      if (!versionEntry) {
        throw new Error(`version ${version} not found for ${dependency.name}`)
      }
      const url = versionEntry.urls[0]
      logger.debug(`⬇️  downloading chart ${url}`)
      await downloadFile(url, zfile, logger)
    }
  }
  return zfile
}
