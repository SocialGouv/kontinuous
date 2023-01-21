const fs = require("fs-extra")

const recurseDependencies = require("helm-tree/dependencies/recurse")
const copyFilter = require("~common/config/copy-filter")

module.exports = async (config) => {
  const { workspaceKsPath, buildPath } = config
  const filesDir = `${workspaceKsPath}/files`
  if (!(await fs.pathExists(filesDir))) {
    return
  }
  await fs.copy(filesDir, `${buildPath}/files`, {
    dereference: true,
    filter: copyFilter,
  })
  await recurseDependencies({
    config,
    afterChildren: async ({ target }) => {
      const chartsDir = `${target}/charts`
      if (!fs.pathExists(chartsDir)) {
        return
      }
      const chartDirs = await fs.readdir(chartsDir)
      for (const chartDir of chartDirs) {
        const chartDirPath = `${chartsDir}/${chartDir}`
        if (!(await fs.stat(chartDirPath)).isDirectory) {
          continue
        }
        const filesPath = `${chartDirPath}/files`
        if (!(await fs.pathExists(filesPath))) {
          fs.symlink(filesDir, filesPath)
        }
        const filesPathKontinuous = `${chartDirPath}/kontinuous-files`
        fs.symlink(filesDir, filesPathKontinuous)
      }
    },
  })
}
