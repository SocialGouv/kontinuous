const fs = require('fs');
const shell = require("./utils/shell")

const values = JSON.parse(fs.readFileSync(`compiled.values.json`))

const chart = JSON.parse(shell(`yq Chart.yaml -o json`))

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
fs.writeFileSync("Chart.yaml", JSON.stringify(chart, null, 2))


for (const {name, alias} of dependencies){
  const key = alias || name
  if (!values[key]){
    values[key] = {}
  }
  values[key].component = key
}
fs.writeFileSync("compiled.values.json", JSON.stringify(values, null, 2))