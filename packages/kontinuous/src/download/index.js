const fs = require("fs")

const axios = require("axios")
const qs = require("qs")

const logger = require("~common/utils/logger")
const ctx = require("~/ctx")

module.exports = async ({ name, file }) => {
  const config = ctx.require("config")
  const dest = name || "manifests"

  if (!file) {
    file = `${dest}.yaml`
  }
  let { downloadUrl } = config

  if (name) {
    const url = new URL(downloadUrl)
    url.search = qs.stringify({
      ...qs.parse(url.search.slice(1)),
      name,
    })
    downloadUrl = url.toString()
  }

  logger.info(`downloading artifact "${dest}" to "${file}"`)
  try {
    const writer = fs.createWriteStream(file)
    const response = await axios.request({
      method: "GET",
      url: downloadUrl,
      responseType: "stream",
    })
    await new Promise((resolve, reject) => {
      response.data.pipe(writer)
      let error = null
      writer.on("error", (err) => {
        error = err
        writer.close()
        reject(err)
      })
      writer.on("close", () => {
        if (!error) {
          resolve(true)
        }
        // no need to call the reject here, as it will have been called in the
        // 'error' stream;
      })
    })
    logger.info(`downloaded artifact "${dest}" to "${file}"`)
    return true
  } catch (error) {
    if (error.response) {
      logger.error(
        `download error: status ${error.response.status} ${error.response.statusText}`
      )
      if (error.response.data.msg) {
        logger.error(error.response.data.msg)
      }
      logger.debug(error.response.headers)
      // logger.error(error.request)
    } else if (error.request) {
      logger.error(`download error: request`)
      logger.error(error.request)
    } else {
      logger.error(`download error: ${error.message}`)
    }
    return false
  }
}
