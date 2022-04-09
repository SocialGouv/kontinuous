const { buildCtx } = require("~/build/ctx")

module.exports = (_manifests, values) => {
  const logger = buildCtx.require("logger")
  for (const [key, value] of Object.entries(values)) {
    if (key === "jobs" || key.startsWith("jobs-")) {
      if (value?.enabled && !Object.keys(value).includes("runs")) {
        logger.warn(`missing "runs" key for jobs component called "${key}"`)
        // throw new Error(`missing "runs" key for jobs component called "${key}"`)
      }
    }
  }
}
