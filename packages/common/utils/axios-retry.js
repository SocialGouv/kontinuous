const axios = require("axios")
const axiosRetry = require("axios-retry")

const kontinuousVersion = require("./kontinuous-version")

const client = axios.create({
  headers: { "User-Agent": `kontinuous v${kontinuousVersion}` },
})

axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
})

module.exports = client
