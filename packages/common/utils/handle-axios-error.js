const globalLogger = require("./logger")

module.exports = (error, logger = globalLogger) => {
  const url = error.request?.res?.responseUrl
  if (error.response) {
    logger.error(
      {
        status: error.response.status,
        statusText: error.response.statusText,
        url,
      },
      "request error"
    )
    if (error.response.data.msg) {
      logger.error(error.response.data.msg)
    }
  } else {
    logger.error({ errorMessage: error.message, url }, "request error")
  }
}
