const axios = require("axios")
const axiosRetry = require("axios-retry")
const { HttpProxyAgent } = require("http-proxy-agent")
const { HttpsProxyAgent } = require("https-proxy-agent")

const kontinuousVersion = require("./kontinuous-version")

const httpProxy = process.env.HTTP_PROXY || process.env.http_proxy
const httpsProxy = process.env.HTTPS_PROXY || process.env.https_proxy

const client = axios.create({
  headers: {
    "User-Agent": `kontinuous v${kontinuousVersion}`,
    "Accept-Encoding": "gzip,deflate,compress", // see https://github.com/axios/axios/issues/5346#issuecomment-1340241163
  },
  ...(httpProxy ? { httpAgent: new HttpProxyAgent(httpProxy) } : {}),
  ...(httpsProxy ? { httpsAgent: new HttpsProxyAgent(httpsProxy) } : {}),
  ...(httpProxy || httpsProxy ? { proxy: false } : {}),
})

axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
})

module.exports = client
