const set = require("lodash.set")

const expandDotNotation = (o) => {
  if (Array.isArray(o)) {
    for (const value of o) {
      expandDotNotation(value)
    }
  } else {
    for (const [key, value] of Object.entries(o)) {
      if (key.slice(0, 1) === ".") {
        set(o, key.slice(1), value)
        delete o[key]
      }
      if (typeof value === "object" && value !== null) {
        expandDotNotation(value)
      }
    }
  }
}
module.exports = expandDotNotation
