const axios = require("axios")

const normalizeRepositoryUrl = require("./normalize-repository-url")
const defaultLogger = require("./logger")

module.exports = async ({
  ref,
  file,
  repositoryUrl,
  logger = defaultLogger,
}) => {
  const repoUrl = normalizeRepositoryUrl(repositoryUrl)
  const rawUrlParts = [repoUrl, "raw", ref, file]
  const rawUrl = rawUrlParts.join("/")

  logger.debug({ rawUrl }, `downloading file "${file}" ...`)
  try {
    const response = await axios.get(rawUrl)
    return response.data
  } catch (error) {
    if (error.response?.status === 404) {
      logger.debug({ rawUrl, ref, file }, `file "${file}" not found`)
    } else {
      logger.error({ rawUrl, ref, file, error }, `unable to retrieve "${file}"`)
      throw error
    }
  }
}
