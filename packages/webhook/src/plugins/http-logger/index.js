const nctx = require("nctx")

const ctx = nctx.create(Symbol(__dirname.split("/").pop()))

module.exports.create = () => {
  const logger = ctx.require("logger")
  const config = ctx.require("config")
  const { httpLogger: httpLoggerConfig = {} } = config
  const { hideSecrets = [] } = httpLoggerConfig
  return (req, res, next) => {
    const originalSend = res.send
    res.send = function (...args) {
      originalSend.apply(res, args)

      let { originalUrl: url } = req
      for (const secret of hideSecrets) {
        url = url.replaceAll(secret, "*".repeat(secret.length))
      }
      const userAgent = req.headers["user-agent"]
      logger.info(
        { userAgent, code: res.statusCode },
        `${req.method} ${url} ${res.statusCode}`
      )
    }
    next()
  }
}
module.exports.dependencies = ["logger", "config"]

module.exports.ctx = ctx
