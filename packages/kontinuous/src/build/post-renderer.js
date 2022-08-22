const fs = require("fs-extra")
const yaml = require("~common/utils/yaml")
const asyncShell = require("~common/utils/async-shell")

module.exports = async (manifests, config) => {
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
