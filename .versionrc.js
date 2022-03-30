const fs = require("fs-extra")

const yaml = require("js-yaml")

const getDirectoriesSync = require("./packages/workflow/build/utils/getDirectoriesSync")

const chartsUpdater = {
  readVersion: (contents) => {
    let chart;
    try {
      chart = yaml.load(contents, 'utf-8');
    } catch (e) {
      console.error(e);
      throw e;
    }
    return chart.version;
  },
  writeVersion: (contents, version) => {
    let chart = yaml.load(contents, 'utf8');
    chart.version = version;
    chart.appVersion = version;
    const { dependencies } = chart
    if (dependencies) {
      for (const dependency of dependencies) {
        if (dependency.repository.startsWith("file://./charts/")) {
          dependency.version = version
        }
      }
    }
    return yaml.dump(chart, { indent: 2 });
  }
}

const bumpFiles = [{ filename: "package.json", type: "json" }]

const getChartsRecursive = (dir = "charts", list=[])=>{
  const chartList = getDirectoriesSync(dir)
  list.push(...chartList.map(c =>`${dir}/${c}`))
  for (const chartName of chartList){
    const childDir = `${dir}/${chartName}/charts`
    if (fs.pathExistsSync(childDir)){
      list.push(...getChartsRecursive(childDir))
    }
  }
  return list
}
const charts = getChartsRecursive()

bumpFiles.push(...charts.map((chartDir) => ({
  filename: `${chartDir}/Chart.yaml`,
  updater: chartsUpdater
})))

module.exports = {
  bumpFiles,
}