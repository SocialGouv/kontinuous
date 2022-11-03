const fs = require("fs-extra")
const asyncShell = require("./async-shell")
const logger = require("./logger")

module.exports = async (target) => {
  if (
    ((await fs.pathExists(`${target}/node_modules`)) &&
      (await fs.readdir(`${target}/node_modules`)).length > 0) ||
    (await fs.pathExists(`${target}/.pnp.cjs`))
  ) {
    return
  }
  try {
    await asyncShell("yarn install", { cwd: target }, (proc) => {
      proc.stdout.on("data", (data) => {
        logger.trace(data.toString())
      })
      proc.stderr.on("data", (data) => {
        logger.warn(data.toString())
      })
    })
  } catch (error) {
    logger.error({ error }, `yarn failed in "${target}"`)
    throw error
  }
}
