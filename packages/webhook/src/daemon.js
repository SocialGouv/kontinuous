const cron = require("node-cron")

const ctx = require("~common/ctx")

const cleanArtifact = require("~/cron/clean-artifact")

module.exports = async () => {
  if (process.argv[2] === "build") {
    return
  }

  ctx.provide()

  // at minute 0 past every 6th hour. see https://crontab.guru/
  cron.schedule("0 */6 * * *", cleanArtifact)
}
