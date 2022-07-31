const axios = require("axios")

const normalizeRepositoryUrl = require("./normalize-repository-url")
const defaultLogger = require("./logger")
const handleAxiosError = require("./hanlde-axios-error")

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
    handleAxiosError(error, logger)
  }
}
