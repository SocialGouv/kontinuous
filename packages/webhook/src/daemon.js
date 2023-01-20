const cron = require("node-cron")

const ctx = require("~common/ctx")
const createLogger = require("~common/utils/pino-factory")

const cleanArtifact = require("~/cron/clean-artifact")

module.exports = async () => {
  if (process.argv[2] === "build") {
    return
  }

  ctx.provide()
  ctx.set("logger", createLogger())

  // at minute 0 past every 6th hour. see https://crontab.guru/
  cron.schedule("0 */6 * * *", cleanArtifact)
}
