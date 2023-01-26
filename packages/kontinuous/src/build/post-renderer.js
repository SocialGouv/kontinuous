const fs = require("fs-extra")

const yaml = require("~common/utils/yaml")
const asyncShell = require("~common/utils/async-shell")
const ctx = require("~common/ctx")

module.exports = async (manifests) => {
  const abortSignal = ctx.require("abortSignal")
  abortSignal.throwIfAborted()

  const config = ctx.require("config")

  if (config.disableStep.includes("post-renderer")) {
    return
  }

  const logger = ctx.require("logger")
  logger.info("🌀 [LIFECYCLE]: post-renderer")

  const { buildPath } = config
  const postRendererPath = `${buildPath}/charts/project/post-renderer`
  if (!(await fs.pathExists(postRendererPath))) {
    return manifests
  }
  const json = JSON.stringify(manifests)

  const rendered = await asyncShell(postRendererPath, {}, (proc) => {
    proc.stdin.write(json)
    proc.stdin.end()
  })

  manifests = yaml.loadAll(rendered)
  return manifests
}
