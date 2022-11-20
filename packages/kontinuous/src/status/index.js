const ctx = require("~common/ctx")
const axios = require("~common/utils/axios-retry")
const handleAxiosError = require("~common/utils/handle-axios-error")

const setStatus = async ({ url, token, status, ok = null }) => {
  const logger = ctx.require("logger")
  logger.info(`setting deploy status to ${status}`)
  try {
    const response = await axios.request({
      method: "POST",
      url,
      headers: { Authorization: `Bearer ${token}` },
      data: { status, ok },
    })
    logger.debug(response.data)
    return true
  } catch (error) {
    handleAxiosError(error, logger)
    return false
  }
}

const getStatus = async ({ url, token }) => {
  const logger = ctx.require("logger")
  logger.debug(`getting deploy status`)
  try {
    const response = await axios.request({
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
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
