const fs = require("fs-extra")
const semver = require("semver")
const axios = require("~common/utils/axios-retry")
const yaml = require("~common/utils/yaml")
const downloadFile = require("~common/utils/download-file")
const slug = require("~common/utils/slug")
const handleAxiosError = require("~common/utils/handle-axios-error")

function satisfiesVersion(availableVersion, requiredVersion) {
  // If requiredVersion is an exact version (no special characters), do a direct comparison
  if (/^\d+\.\d+\.\d+$/.test(requiredVersion)) {
    return availableVersion === requiredVersion
  }

  // For all other cases, use semver.satisfies
  return semver.satisfies(availableVersion, requiredVersion)
}

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

      // Find all versions that satisfy the constraint
      const satisfyingVersions = entryVersions.filter((entry) =>
        satisfiesVersion(entry.version, dependency.version)
      )

      if (satisfyingVersions.length === 0) {
        throw new Error(
          `No matching version found for ${dependency.name}@${version}`
        )
      }

      // Sort the satisfying versions in descending order
      satisfyingVersions.sort((a, b) => semver.rcompare(a.version, b.version))

      // Select the newest version that satisfies the constraint
      const versionEntry = satisfyingVersions[0]

      let url = versionEntry.urls[0]
      // Check if the URL is relative and add the repository as prefix if needed
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = `${repository.replace(/\/$/, "")}/${url.replace(/^\//, "")}`
      }
      logger.debug(`⬇️  downloading chart ${url}`)
      await downloadFile(url, zfile, logger)
    }
  }
  return zfile
}
