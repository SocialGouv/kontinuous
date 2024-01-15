const { default: axios } = require("axios")
const { default: axiosRetry } = require("axios-retry")

const kontinuousVersion = require("./kontinuous-version")

const client = axios.create({
  headers: {
    "User-Agent": `kontinuous v${kontinuousVersion}`,
    "Accept-Encoding": "gzip,deflate,compress", // see https://github.com/axios/axios/issues/5346#issuecomment-1340241163
  },
})

axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
})

module.exports = client
