const fs = require('fs');
const yaml = require('js-yaml');

module.exports = (values) => {
  const chart = yaml.load(fs.readFileSync("Chart.yaml"))

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
  fs.writeFileSync("Chart.yaml", yaml.dump(chart))

  for (const {name, alias} of dependencies){
    const key = alias || name
    if (!values[key]){
      values[key] = {}
    }
    values[key].component = key
  }

  return chart

}