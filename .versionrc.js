
const yaml = require("js-yaml")

const getDirectoriesSync = require("./action/build/utils/getDirectoriesSync")

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

const chartsPath = "charts"
const charts = getDirectoriesSync(chartsPath)
bumpFiles.push(...charts.map((chartName) => ({
  filename: `${chartsPath}/${chartName}/Chart.yaml`,
  updater: chartsUpdater
})))

module.exports = {
  bumpFiles,
}