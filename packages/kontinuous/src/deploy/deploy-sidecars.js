const fs = require("fs-extra")

const ctx = require("~common/ctx")
const promiseAll = require("~common/utils/promise-all")

const createContext = require("~/plugins/context")
const pluginFunction = require("~/plugins/context/function")

module.exports = async ({ manifests, runContext, dryRun }) => {
  const config = ctx.require("config")
  const type = `deploy-sidecars`
  const { deploysPromise } = runContext
  const context = createContext({
    type,
    runContext,
    manifests,
    dryRun,
    deploysPromise,
  })
  const { buildProjectPath } = config
  const requirePath = `${buildProjectPath}/${type}`
  let sidecars = []
  if (await fs.pathExists(requirePath)) {
    sidecars = await pluginFunction(requirePath)(sidecars, {}, context)
  }

  const sidecarPromises = []
  const sidecarStoppers = []
  for (const sidecar of sidecars) {
    const { promise, stopSidecar } = await sidecar
    sidecarPromises.push(promise)
    sidecarStoppers.push(stopSidecar)
  }
  const stopSidecars = () => {
    sidecarStoppers.forEach((stop) => {
      stop()
    })
  }

  const sidecarsPromise = new Promise(async (resolve, reject) => {
    try {
      const results = await promiseAll(sidecarPromises)
      const errors = results
        .filter((result) => result?.errors)
        .flatMap((result) => result.errors)
      resolve({ errors })
    } catch (err) {
      reject(err)
    }
  })

  return {
    stopSidecars,
    sidecarsPromise,
  }
}
