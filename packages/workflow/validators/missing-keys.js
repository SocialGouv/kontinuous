const { buildCtx } = require("~/build/ctx")

module.exports = (manifests, values) => {
  const logger = buildCtx.require("logger")
  for (const [key, value] of Object.entries(values)) {
    if (key === "jobs" || key.startsWith("jobs-")) {
      if (!Object.keys(value).includes("runs")) {
        logger.warn(`missing "runs" key for jobs component called "${key}"`)
        // throw new Error(`missing "runs" key for jobs component called "${key}"`)
      }
    }
  }
}
