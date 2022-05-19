const fs = require("fs")
const path = require("path")
const camelcase = require("lodash.camelcase")

module.exports = (dir, { filter = null } = {}) => {
  let files = fs.readdirSync(dir)
  if (filter) {
    files = files.filter(filter)
  }
  return files.reduce((acc, file) => {
    const key = camelcase(path.parse(file).name)
    acc[key] = require(`${dir}/${file}`)
    return acc
  }, {})
}
