const fs = require('fs');

const envsDir = `${__dirname}/envs`
const getFiles = (path) => fs.readdirSync(path).filter(file => fs.lstatSync(`${path}/${file}`).isFile())
const envs = getFiles(envsDir)

module.exports = () => {
  const env = {...process.env}
  for (const envFile of envs) {
    const vars = require(`${envsDir}/${envFile}`)
    for (const [dest, src] of Object.entries(vars)) {
      env[dest] = env[dest] || process.env[src]
    }
  }
  return env
}
