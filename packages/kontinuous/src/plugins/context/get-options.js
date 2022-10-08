const path = require("path")

const get = require("lodash.get")

const deepmerge = require("~common/utils/deepmerge")

const configDependencyKey = require("~common/utils/config-dependency-key")

module.exports = ({ scope, inc, type, config }) => {
  let dotInc

  const ext = path.extname(inc)
  if (ext) {
    inc = inc.slice(0, inc.length - ext.length)
  }

  scope = scope.slice(1)
  inc = inc.split("/").pop()

  scope = scope.map(configDependencyKey)
  inc = configDependencyKey(inc)
  type = configDependencyKey(type)

  dotInc = [...scope]
  if (
    !(dotInc[dotInc.length - 1] === inc && dotInc[dotInc.length - 2] === type)
  ) {
    if (inc !== type) {
      dotInc.push(type)
    }
    dotInc.push(inc)
  }

  dotInc = dotInc.flatMap((k) =>
    k.split(".").map((k2) => configDependencyKey(k2))
  )

  const options = {}

  let dependenciesRef = config.dependencies
  for (let i = 0; i < dotInc.length; i++) {
    const part = dotInc[i]
    if (!dependenciesRef || !Object.keys(dependenciesRef).includes(part)) {
      break
    }
    dependenciesRef = dependenciesRef[part]?.dependencies
    dotInc[i] = `dependencies.${dotInc[i]}`
  }

  for (let i = 1; i <= dotInc.length; i++) {
    const dots = [...dotInc.slice(0, i), "options"]

    const key = dots.join(".")
    const opts = get(config, key) || {}
    deepmerge(options, opts)
  }

  return options
}
