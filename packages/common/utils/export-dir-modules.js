const fs = require("fs")
const path = require("path")
const camelcase = require("lodash.camelcase")
const ucfirst = require("./ucfirst")

/**
 *
 * @param {string} dir
 * @param {{filter?: null | ((s: string) => boolean)}} param1
 * @returns Record<string, any>
 */
module.exports = (dir, { filter = null } = {}) => {
  let files = fs.readdirSync(dir)
  if (filter) {
    files = files.filter(filter)
  }
  return files.reduce(
    /** @param {Record<string, any>} acc */
    (acc, file) => {
      const { name } = path.parse(file)
      let key = camelcase(name)
      if (key.endsWith("Class")) {
        key = ucfirst(key.slice(0, -5))
      }
      acc[key] = require(`${dir}/${file}`)
      return acc
    },
    {}
  )
}
