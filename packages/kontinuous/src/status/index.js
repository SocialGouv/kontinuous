const axios = require("axios")
const logger = require("~common/utils/logger")

const setStatus = async ({ url, status, ok = null }) => {
  logger.info(`setting deploy status to ${status}`)
  try {
    const response = await axios.request({
      method: "POST",
      url,
      data: { status, ok },
    })
    logger.debug(response.data)
    return true
  } catch (error) {
    if (error.response) {
      logger.error(`post status error: status ${error.response.status}`)
      logger.error(error.response.data)
      logger.debug(error.response.headers)
      logger.error(error.request)
    } else if (error.request) {
      logger.error(`post status error: request`)
      logger.error(error.request)
    } else {
      logger.error(`post status error: ${error.message}`)
    }
    return false
  }
}

module.exports = {
  setStatus,
}
