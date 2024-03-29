const axios = require("./axios-retry")

const normalizeRepositoryUrl = require("./normalize-repository-url")
const getLogger = require("./get-logger")
const handleAxiosError = require("./handle-axios-error")

module.exports = async ({ ref, file, repositoryUrl, logger = getLogger() }) => {
  const repoUrl = normalizeRepositoryUrl(repositoryUrl)
  const rawUrlParts = [repoUrl, "raw", ref, file]
  const rawUrl = rawUrlParts.join("/")

  logger.debug({ rawUrl }, `downloading file "${file}" ...`)
  try {
    const response = await axios.get(rawUrl)
    return response.data
  } catch (error) {
    handleAxiosError(error, logger)
  }
}
