const axios = require("axios")
const FormData = require("form-data")
const qs = require("qs")
const fs = require("fs-extra")

const ctx = require("~common/ctx")
const handleAxiosError = require("~common/utils/hanlde-axios-error")

module.exports = async ({ name, file }) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")

  const manifests = await fs.readFile(file, { encoding: "utf-8" })

  const dest = name || "manifests"

  logger.info(`uploading "${file}" as artifact "${dest}"`)

  let { uploadUrl } = config

  if (name) {
    const url = new URL(uploadUrl)
    url.search = qs.stringify({
      ...qs.parse(url.search.slice(1)),
      name,
    })
    uploadUrl = url.toString()
  }

  const form = new FormData()
  form.append("manifests", manifests, {
    filename: "manifests.yaml",
    contentType: "text/x-yaml",
  })

  logger.info(`uploading "${file}" as artifact "${dest}"`)
  try {
    const response = await axios.request({
      method: "POST",
      url: uploadUrl,
      data: form,
      headers: form.getHeaders(),
    })
    logger.debug(response.data)
    logger.info(`uploaded "${file}" as artifact "${dest}"`)
    return true
  } catch (error) {
    handleAxiosError(error, logger)
    return false
  }
}
