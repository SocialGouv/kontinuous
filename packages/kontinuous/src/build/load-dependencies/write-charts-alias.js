const path = require("path")

const fs = require("fs-extra")

const yaml = require("~common/utils/yaml")

module.exports = async (chartsAliasMap, config) => {
  const { buildPath } = config
  for (const [scope, aliasMap] of chartsAliasMap.entries()) {
    const p = []
    for (const s of scope) {
      p.push("charts")
      p.push(s)
    }
    const chartFile = `${buildPath}/${path.join(...p)}/Chart.yaml`
    const chartContent = await fs.readFile(chartFile)
    const chart = yaml.load(chartContent)
    for (const [alias, name] of Object.entries(aliasMap)) {
      const aliasOf = chart.dependencies.find((dep) => dep.name === name)
      chart.dependencies.push({
        ...aliasOf,
        alias,
        ...(aliasOf.condition
          ? {
              condition: aliasOf.condition.replaceAll(
                `${aliasOf.name}.enabled`,
                `${alias}.enabled`
              ),
            }
          : {}),
      })
    }
    await fs.writeFile(chartFile, yaml.dump(chart))
  }
}
