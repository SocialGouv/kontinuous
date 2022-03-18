const fs = require('fs-extra');
const yaml = require('js-yaml');

module.exports = async (values) => {
  const chart = yaml.load(await fs.readFile("Chart.yaml", { encoding: "utf-8" }))

  const { dependencies } = chart

  const dependenciesByName = dependencies.reduce((acc, value)=>{
    acc[value.name] = value
    return acc
  }, {})

  const componentKeys = Object.keys(values)

  for (const {name} of [...dependencies]){
    for (const componentKey of componentKeys){
      if (componentKey !== name && componentKey.startsWith(name+"-")){
        dependencies.push({
          ...dependenciesByName[name],
          alias: componentKey,
          condition: `${componentKey}.enabled`
        })
      }
    }
  }
  await fs.writeFile("Chart.yaml", yaml.dump(chart))

  for (const {name, alias} of dependencies){
    const key = alias || name
    if (!values[key]){
      values[key] = {}
    }
    values[key].component = key
  }

  return chart

}