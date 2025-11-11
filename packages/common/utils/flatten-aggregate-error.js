const indent = require("./indent")

module.exports = (aggregateError) => {
  console.log("aggregateError", aggregateError)
  return new Error(
    `${aggregateError.name} ${aggregateError.message}: \n${indent(
      aggregateError.errors
        .map((error) => `${error.stack.toString()}`)
        .join("\n"),
      2
    )}`
  )
}
