const axios = require("axios")
const FormData = require("form-data")

const logger = require("~common/utils/logger")

module.exports = async ({ uploadUrl, manifests }) => {
  logger.info("uploading manifests artifact")

  const form = new FormData()
  form.append("manifests", manifests, {
    filename: "manifests.yaml",
    contentType: "text/x-yaml",
  })

  try {
    const response = await axios.request({
      method: "POST",
      url: uploadUrl,
      data: form,
      headers: form.getHeaders(),
    })
    logger.debug(response.data)
    logger.info("uploaded manifests artifact")
    return true
  } catch (error) {
    if (error.response) {
      logger.error(`upload error: status ${error.response.status}`)
      logger.error(error.response.data)
      logger.debug(error.response.headers)
      logger.error(error.request)
    } else if (error.request) {
      logger.error(`upload error: request`)
      logger.error(error.request)
    } else {
      logger.error(`upload error: ${error.message}`)
    }
    return false
  }
}
