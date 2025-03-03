const path = require("path")
const fs = require("fs-extra")
const semver = require("semver")
const axios = require("~common/utils/axios-retry")
const yaml = require("~common/utils/yaml")
const downloadFile = require("~common/utils/download-file")
const slug = require("~common/utils/slug")
const asyncShell = require("~common/utils/async-shell")
const handleAxiosError = require("~common/utils/handle-axios-error")

function satisfiesVersion(availableVersion, requiredVersion) {
  // If requiredVersion is an exact version (no special characters), do a direct comparison
  if (/^\d+\.\d+\.\d+$/.test(requiredVersion)) {
    return availableVersion === requiredVersion
  }

  // For all other cases, use semver.satisfies
  return semver.satisfies(availableVersion, requiredVersion)
}

function isOciRepository(repository) {
  return repository.startsWith("oci://")
}

async function downloadOciChart({ dependency, cachePath, logger }) {
  const { repository, version, name } = dependency
  const archiveSlug = slug([name, version, repository])
  const zfile = path.join(cachePath, `${archiveSlug}.tgz`)

  if (await fs.pathExists(zfile)) {
    return zfile
  }

  await fs.ensureDir(cachePath)

  logger.debug(`⬇️  pulling OCI chart ${repository}/${name}:${version}`)

  try {
    const ociReference = `${repository}/${name}`
    logger.debug(`Using OCI reference: ${ociReference}`)
    await asyncShell(
      `helm pull ${ociReference} --version ${version} --destination ${cachePath}`,
      {},
      null,
      logger
    )

    // Helm pull saves the file with a different naming convention
    // We need to rename it to match our expected format
    const helmOutputFile = path.join(cachePath, `${name}-${version}.tgz`)

    if ((await fs.pathExists(helmOutputFile)) && helmOutputFile !== zfile) {
      await fs.rename(helmOutputFile, zfile)
    }

    return zfile
  } catch (error) {
    throw new Error(`Failed to pull OCI chart: ${error.message}`)
  }
}

async function downloadTraditionalChart({ dependency, cachePath, logger }) {
  const { repository, version, name } = dependency
  const archiveSlug = slug([name, version, repository])
  const zfile = path.join(cachePath, `${archiveSlug}.tgz`)

  if (await fs.pathExists(zfile)) {
    return zfile
  }

  await fs.ensureDir(cachePath)
  const chartRepository = `${repository}/index.yaml`
  let repositoryIndex

  try {
    logger.debug(`⬇️  downloading chart repository index ${chartRepository}`)
    repositoryIndex = await axios.get(chartRepository)
  } catch (e) {
    handleAxiosError(e, logger)
    throw Error(`Unable to download ${chartRepository}: ${e.message}`)
  }

  const repo = yaml.load(repositoryIndex.data)
  const { entries } = repo
  const entryVersions = entries[name]

  if (!entryVersions) {
    throw new Error(`Chart '${name}' not found in repository ${repository}`)
  }

  // Find all versions that satisfy the constraint
  const satisfyingVersions = entryVersions.filter((entry) =>
    satisfiesVersion(entry.version, version)
  )

  if (satisfyingVersions.length === 0) {
    throw new Error(`No matching version found for ${name}@${version}`)
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

  return zfile
}

module.exports = async ({ dependency, target, cachePath, logger }) => {
  const { repository, version } = dependency
  const localArchive = path.join(
    target,
    "charts",
    `${dependency.name}-${version}.tgz`
  )

  let zfile
  if (await fs.pathExists(localArchive)) {
    zfile = localArchive
  } else if (isOciRepository(repository)) {
    zfile = await downloadOciChart({ dependency, cachePath, logger })
  } else {
    zfile = await downloadTraditionalChart({ dependency, cachePath, logger })
  }

  return zfile
}
