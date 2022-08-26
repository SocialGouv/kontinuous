const fs = require("fs")

const qs = require("qs")

const ctx = require("~common/ctx")
const axios = require("~common/utils/axios-retry")
const handleAxiosError = require("~common/utils/handle-axios-error")

module.exports = async ({ name, file }) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")
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
    handleAxiosError(error, logger)
    return false
  }
}
