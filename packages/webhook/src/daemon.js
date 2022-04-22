const cron = require("node-cron")
const cleanArtifact = require("~/cron/clean-artifact")

module.exports = () => {
  if (process.argv[2] === "build") {
    return
  }

  // at minute 0 past every 6th hour. see https://crontab.guru/
  cron.schedule("0 */6 * * *", cleanArtifact)
}
