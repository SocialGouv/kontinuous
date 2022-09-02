const yaml = require("js-yaml")


module.exports = {
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