const axios = require("axios")

const ctx = require("~common/ctx")
const handleAxiosError = require("~common/utils/hanlde-axios-error")

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
    handleAxiosError(error, logger)
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
    handleAxiosError(error, logger)
    return false
  }
}

module.exports = {
  getStatus,
  setStatus,
}
