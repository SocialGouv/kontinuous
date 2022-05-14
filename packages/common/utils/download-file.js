const fs = require("fs")
const stream = require("stream")
const { promisify } = require("util")

const axios = require("axios")

const finished = promisify(stream.finished)

module.exports = async (fileUrl, outputLocationPath) => {
  const writer = fs.createWriteStream(outputLocationPath)
  return axios({
    method: "get",
    url: fileUrl,
    responseType: "stream",
  }).then((response) => {
    response.data.pipe(writer)
    return finished(writer)
  })
}
