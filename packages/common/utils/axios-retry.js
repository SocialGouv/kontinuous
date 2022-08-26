const axios = require("axios")
const axiosRetry = require("axios-retry")

const client = axios.create()

axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
})

module.exports = client
