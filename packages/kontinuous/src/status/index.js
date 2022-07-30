const axios = require("axios")

const ctx = require("~common/ctx")

const setStatus = async ({ url, status, ok = null }) => {
  const logger = ctx.require("logger")
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

const getStatus = async ({ url }) => {
  const logger = ctx.require("logger")
  logger.debug(`getting deploy status`)
  try {
    const response = await axios.request({
      method: "GET",
      url,
    })
    logger.debug(`deploy status: ${response.data.status}`)
    return response.data
  } catch (error) {
    if (error.response) {
      logger.error(`get status error: status ${error.response.status}`)
      logger.error(error.response.data)
      logger.debug(error.response.headers)
      logger.error(error.request)
    } else if (error.request) {
      logger.error(`get status error: request`)
      logger.error(error.request)
    } else {
      logger.error(`get status error: ${error.message}`)
    }
    return false
  }
}

module.exports = {
  getStatus,
  setStatus,
}
