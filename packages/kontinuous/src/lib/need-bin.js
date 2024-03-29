const ctx = require("~common/ctx")

module.exports = async (needFunc) => {
  const config = ctx.require("config")
  const logger = ctx.require("logger")
  await needFunc({
    addPath: `${config.kontinuousHomeDir}/bin`,
    cacheDir: `${config.kontinuousHomeDir}/cache`,
    logger,
    forceDownload: config.externalBinForceDownload,
  })
}
