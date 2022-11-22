const fs = require("fs-extra")

const ctx = require("~common/ctx")

const promiseGetAll = require("~common/utils/promise-get-all")

const createContext = require("~/plugins/context")
const pluginFunction = require("~/plugins/context/function")

module.exports = async ({ manifestsFile, manifests, runContext, dryRun }) => {
  const config = ctx.require("config")
  const type = `deploy-with`
  const context = createContext({
    type,
    runContext,
    manifestsFile,
    manifests,
    dryRun,
  })
  const { buildProjectPath } = config
  const requirePath = `${buildProjectPath}/${type}`
  let deploys = []
  if (await fs.pathExists(requirePath)) {
    deploys = await pluginFunction(requirePath)(deploys, {}, context)
  }

  const deployPromises = []
  const deployStoppers = []
  for (const deploy of deploys) {
    const { promise, stopDeploy } = await deploy
    deployPromises.push(promise)
    deployStoppers.push(stopDeploy)
  }
  const stopDeploys = () => {
    deployStoppers.forEach((stop) => {
      stop()
    })
  }

  const deploysPromise = new Promise(async (resolve, reject) => {
    try {
      const { values, errors } = await promiseGetAll(deployPromises)
      errors.push(
        ...values
          .filter((result) => result?.errors)
          .flatMap((result) => result.errors)
      )
      resolve({ errors })
    } catch (err) {
      reject(err)
    }
  })

  return {
    stopDeploys,
    deploysPromise,
  }
}
