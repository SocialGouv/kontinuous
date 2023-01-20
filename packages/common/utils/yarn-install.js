const fs = require("fs-extra")
const { compare } = require("compare-versions")

const asyncShell = require("./async-shell")
const getLogger = require("./get-logger")

module.exports = async (target, { logger = getLogger() } = {}) => {
  if (
    ((await fs.pathExists(`${target}/node_modules`)) &&
      (await fs.readdir(`${target}/node_modules`)).length > 0) ||
    (await fs.pathExists(`${target}/.pnp.cjs`))
  ) {
    return
  }
  const yarnArgs = []
  const yarnVersion = (
    await asyncShell("yarn --version", { cwd: target })
  ).trim()
  if (compare(yarnVersion, "2.0.0", ">=")) {
    yarnArgs.push("workspaces", "focus", "--production")
    /*
      in yarn >= 2 we need workspaces even if not in monorepo to use --production flag
      to install workspaces plugin, run: `yarn plugin import workspace-tools`
    */
  } else {
    yarnArgs.push("--production")
  }
  try {
    await asyncShell(["yarn", ...yarnArgs], { cwd: target }, (proc) => {
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
