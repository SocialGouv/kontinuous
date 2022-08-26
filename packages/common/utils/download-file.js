const fs = require("fs")
const stream = require("stream")
const { promisify } = require("util")

const axios = require("./axios-retry")

const finished = promisify(stream.finished)

const handleAxiosError = require("./handle-axios-error")

module.exports = async (fileUrl, outputLocationPath, logger) => {
  const writer = fs.createWriteStream(outputLocationPath)
  try {
    const response = await axios({
      method: "get",
      url: fileUrl,
      responseType: "stream",
    })
    response.data.pipe(writer)
    return finished(writer)
  } catch (error) {
    handleAxiosError(error, logger)
    throw error
  }
}
