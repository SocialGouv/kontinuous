function isComponent(names, component) {
  if (!Array.isArray(names)) {
    names = [names]
  }
  return names.some((name) => component[`~chart`]?.endsWith(`.contrib.${name}`))
}

function extractComponents(names, values, acc = []) {
  Object.entries(values).forEach(([key, component]) => {
    if (typeof component === "object" && component !== null) {
      extractComponents(names, component, acc)
      if (component._isChartValues && isComponent(names, component)) {
        acc.push([key, component])
      }
    }
  })
  return acc
}

module.exports = extractComponents
