const fs = require("fs-extra")

const ctx = require("~common/ctx")
const promiseGetAll = require("~common/utils/promise-get-all")

const createContext = require("~/plugins/context")
const pluginFunction = require("~/plugins/context/function")

module.exports = async ({ manifests, dryRun }) => {
  const config = ctx.require("config")
  const type = `deploy-sidecars`
  const context = createContext({
    type,
    manifests,
    dryRun,
  })
  const { buildProjectPath } = config
  const requirePath = `${buildProjectPath}/${type}`
  let sidecars = []
  if (await fs.pathExists(requirePath)) {
    sidecars = pluginFunction(requirePath, true)({}, context)
  }

  const { values, errors } = await promiseGetAll([sidecars])
  errors.push(
    ...values
      .filter((result) => result?.errors)
      .flatMap((result) => result.errors)
  )
  return { errors }
}
