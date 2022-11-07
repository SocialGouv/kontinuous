const fs = require("fs-extra")

// package.json
const getDirectoriesSync = (source) =>
  fs
    .readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() || dirent.isSymbolicLink())
    .map((dirent) => dirent.name)

const bumpFiles = []

bumpFiles.push({ filename: "package.json", type: "json" })
const packageDirs = getDirectoriesSync("packages")
for (const dir of packageDirs) {
  const filename = `packages/${dir}/package.json`
  if (fs.pathExistsSync(filename)) {
    bumpFiles.push({ filename, type: "json" })
  }
}

// charts
const getChartsRecursive = (dir, list = []) => {
  const chartList = getDirectoriesSync(dir)
  list.push(
    ...chartList.map((c) =>
      fs.realpathSync(`${dir}/${c}`).slice(__dirname.length + 1)
    )
  )
  for (const chartName of chartList) {
    const childDir = `${dir}/${chartName}/charts`
    if (fs.pathExistsSync(childDir)) {
      list.push(...getChartsRecursive(childDir))
    }
  }
  return list
}

const chartsUpdater = "packages/dev-tools/lib/standard-version-chart-updater.js"

const charts = getChartsRecursive("plugins")
bumpFiles.push(
  ...charts.map((chartDir) => ({
    filename: `${chartDir}/Chart.yaml`,
    updater: chartsUpdater,
  }))
)

bumpFiles.push({
  filename: `packages/webhook/Chart.yaml`,
  updater: chartsUpdater,
})

// e2e version (docker images, github actions, workflows etc...)
// it works but it's too slow, I prefer external bumper in this case
/*
const versionE2eGetFiles = require("./packages/dev-tools/lib/version-e2e-get-files")

const e2eFiles = versionE2eGetFiles()
const e2eUpdater = "packages/dev-tools/lib/standard-version-e2e-updater.js"

bumpFiles.push(
  ...e2eFiles.map((file) => ({
    filename: file,
    updater: e2eUpdater,
  }))
)
*/

module.exports = {
  bumpFiles,
}
