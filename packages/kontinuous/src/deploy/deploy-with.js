const fs = require("fs-extra")

const ctx = require("~common/ctx")

const promiseGetAll = require("~common/utils/promise-get-all")

const createContext = require("~/plugins/context")
const pluginFunction = require("~/plugins/context/function")

module.exports = async ({ manifestsFile, manifests, dryRun }) => {
  const config = ctx.require("config")
  const type = `deploy-with`
  const context = createContext({
    type,
    manifestsFile,
    manifests,
    dryRun,
  })
  const { buildProjectPath } = config
  const requirePath = `${buildProjectPath}/${type}`
  let deploys = []
  if (await fs.pathExists(requirePath)) {
    deploys = pluginFunction(requirePath, true)({}, context)
  }

  const events = ctx.require("events")

  const { values, errors } = await promiseGetAll([deploys])
  errors.push(
    ...values
      .filter((result) => result?.errors)
      .flatMap((result) => result.errors)
  )

  if (errors.length > 0) {
    events.emit("deploy-with:fail", { errors })
  } else {
    events.emit("deploy-with:success")
  }
  events.emit("deploy-with:finish", { errors })

  return { errors }
}
