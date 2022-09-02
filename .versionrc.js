const fs = require("fs-extra")

const getDirectoriesSync = (source) =>
  fs
    .readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() || dirent.isSymbolicLink())
    .map((dirent) => dirent.name)

const bumpFiles = []

bumpFiles.push({ filename: "package.json", type: "json" })
const packageDirs = getDirectoriesSync("packages")
for (const dir of packageDirs){
  const filename = `packages/${dir}/package.json`
  if(fs.pathExistsSync(filename)){
    bumpFiles.push({ filename, type: "json" })
  }
}

const getChartsRecursive = (dir, list=[])=>{
  const chartList = getDirectoriesSync(dir)
  list.push(...chartList.map(c => fs.realpathSync(`${dir}/${c}`).slice(__dirname.length+1)))
  for (const chartName of chartList){
    const childDir = `${dir}/${chartName}/charts`
    if (fs.pathExistsSync(childDir)){
      list.push(...getChartsRecursive(childDir))
    }
  }
  return list
}

const chartsUpdater = "packages/common/utils/standard-version-chart-updater.js"

const charts = getChartsRecursive("plugins")
bumpFiles.push(...charts.map((chartDir) => ({
  filename: `${chartDir}/Chart.yaml`,
  updater: chartsUpdater
})))

bumpFiles.push({
  filename: `packages/webhook/Chart.yaml`,
  updater: chartsUpdater,
})

module.exports = {
  bumpFiles,
}