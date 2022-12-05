const nctx = require("nctx")

const ctx = nctx.create(Symbol(__dirname.split("/").pop()))

module.exports.create = () => {
  const logger = ctx.require("logger")
  const config = ctx.require("config")
  const { httpLogger: httpLoggerConfig = {} } = config
  const { hideSecrets = [], ignoreUserAgents = [] } = httpLoggerConfig
  return (req, res, next) => {
    const originalSend = res.send
    const userAgent = req.headers["user-agent"]

    let { originalUrl: url } = req
    for (const secret of hideSecrets) {
      url = url.replaceAll(secret, "*".repeat(secret.length))
    }

    const ignoreThisUserAgent = ignoreUserAgents.includes(userAgent)

    if (!ignoreThisUserAgent) {
      logger.info({ userAgent }, `REQ ${req.method} ${url}`)
    }
    res.send = function (...args) {
      originalSend.apply(res, args)
      if (!ignoreThisUserAgent || res.statusCode >= 400) {
        logger.info(
          { userAgent, code: res.statusCode },
          `RES ${req.method} ${url} ${res.statusCode}`
        )
      }
    }
    next()
  }
}
module.exports.dependencies = ["logger", "config"]

module.exports.ctx = ctx
