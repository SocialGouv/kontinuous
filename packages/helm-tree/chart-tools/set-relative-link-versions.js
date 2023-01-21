const fs = require("fs-extra")

const yaml = require("~common/utils/yaml")

// see https://github.com/helm/helm/issues/7093#issuecomment-814003563
const setRelativeLinkVersions = async ({ target, definition, logger }) => {
  const chartFile = `${target}/Chart.yaml`
  const chart = yaml.load(await fs.readFile(chartFile))
  const { dependencies = [] } = chart
  let touched = false
  for (const dependency of dependencies) {
    const { repository } = dependency
    if (repository.startsWith("file://.")) {
      const { name } = dependency
      const chartDir = `${target}/charts`
      const subchartPath = `${chartDir}/${name}`
      const subchart = yaml.load(
        await fs.readFile(`${subchartPath}/Chart.yaml`, { encoding: "utf-8" })
      )
      dependency.version = subchart.version
      touched = true
    }
  }

  if (touched) {
    await fs.writeFile(chartFile, yaml.dump(chart))
  }

  for (const dependency of dependencies) {
    const name = dependency.alias || dependency.name
    const subchartDir = `${target}/charts/${dependency.name}`
    const subDefinition = definition[name] || {}
    await setRelativeLinkVersions({
      target: subchartDir,
      definition: subDefinition,
      logger,
    })
  }
}
module.exports = setRelativeLinkVersions
