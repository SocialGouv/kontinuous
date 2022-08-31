const path = require("path")

const get = require("lodash.get")

const deepmerge = require("~common/utils/deepmerge")

const configDependencyKey = require("./config-dependency-key")

module.exports = ({ scope, inc, type, config }) => {
  let dotInc

  const ext = path.extname(inc)
  if (ext) {
    inc = inc.slice(0, inc.length - ext.length)
  }

  scope = scope.slice(1)
  inc = inc.split("/").pop()

  if (/^[0-9]*-/.test(inc)) {
    inc = inc.slice(inc.indexOf("-") + 1)
  }

  dotInc = [...scope]
  if (inc !== type) {
    dotInc.push(type)
  }
  dotInc.push(inc)

  dotInc = dotInc.flatMap((k) =>
    k.split(".").map((k2) => configDependencyKey(k2))
  )

  const options = {}

  for (let i = 1; i <= dotInc.length; i++) {
    const dots = [...dotInc.slice(0, i), "options"]
    const key = dots.join(".")
    const opts = get(config.dependencies, key) || {}
    deepmerge(options, opts)
  }

  return options
}
