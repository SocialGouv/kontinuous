const fs = require("fs-extra")
const yaml = require("js-yaml")

const { buildCtx } = require("./ctx")

module.exports = async (values) => {
  const { KWBUILD_PATH: rootDir } = buildCtx.require("env")
  const chart = yaml.load(
    await fs.readFile(`${rootDir}/chart/Chart.yaml`, {
      encoding: "utf-8",
    })
  )

  const { dependencies } = chart

  const dependenciesByName = dependencies.reduce((acc, value) => {
    acc[value.name] = value
    return acc
  }, {})

  const componentKeys = Object.keys(values)

  for (const { name } of [...dependencies]) {
    for (const componentKey of componentKeys) {
      const isAnInstanceOf = componentKey.startsWith(`${name}-`)

      // create subcharts alias for components instances
      if (isAnInstanceOf) {
        dependencies.push({
          ...dependenciesByName[name],
          alias: componentKey,
          condition: `${componentKey}.enabled`,
        })
      }

      // enable common extra features for used components
      if (
        (componentKey === name || isAnInstanceOf) &&
        values.global.extra[name]
      ) {
        values.global.extra[name].enabled = true
      }
    }
  }
  await fs.writeFile(`${rootDir}/chart/Chart.yaml`, yaml.dump(chart))

  return chart
}
