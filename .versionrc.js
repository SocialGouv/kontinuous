const fs = require("fs-extra")

const yaml = require("js-yaml")

const getDirectoriesSync = (source) =>
  fs
    .readdirSync(source, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory() || dirent.isSymbolicLink())
    .map((dirent) => dirent.name)

const chartsUpdater = {
  readVersion: (contents) => {
    let chart;
    try {
      chart = yaml.load(contents);
    } catch (e) {
      console.error(e);
      throw e;
    }
    return chart.version;
  },
  writeVersion: (contents, version) => {
    let chart = yaml.load(contents);
    chart.version = version;
    const { dependencies } = chart
    if (dependencies) {
      for (const dependency of dependencies) {
        if (
          dependency.repository.startsWith("file://./charts/") ||
          dependency.repository.startsWith("file://../")
        ) {
          dependency.version = version
        }
      }
    }
    return yaml.dump(chart, { indent: 2 });
  }
}

const bumpFiles = [{ filename: "package.json", type: "json" }]
const packageDirs = getDirectoriesSync("packages")
for (const dir of packageDirs){
  const filename = `packages/${dir}/package.json`
  if(fs.pathExistsSync(filename)){
    bumpFiles.push({ filename, type: "json" })
  }
}

const getChartsRecursive = (dir, list=[])=>{
  const chartList = getDirectoriesSync(dir)
  list.push(...chartList.map(c => fs.realpathSync(`${dir}/${c}`)))
  for (const chartName of chartList){
    const childDir = `${dir}/${chartName}/charts`
    if (fs.pathExistsSync(childDir)){
      list.push(...getChartsRecursive(childDir))
    }
  }
  return list
}
const charts = getChartsRecursive("plugins")
bumpFiles.push(...charts.map((chartDir) => ({
  filename: `${chartDir}/Chart.yaml`,
  updater: chartsUpdater
})))

bumpFiles.push({
  filename: `packages/webhook/Chart.yaml`,
  updater: chartsUpdater
})

module.exports = {
  bumpFiles,
}