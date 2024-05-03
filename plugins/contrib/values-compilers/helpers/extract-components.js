function isComponent(name, component) {
  return component[`~chart`]?.endsWith(`.contrib.${name}`)
}

function extractComponents(name, values, acc = []) {
  Object.entries(values).forEach(([key, component]) => {
    if (typeof component === "object" && component !== null) {
      extractComponents(name, component, acc)
      if (component._isChartValues && isComponent(name, component)) {
        acc.push([key, component])
      }
    }
  })
  return acc
}

module.exports = extractComponents
