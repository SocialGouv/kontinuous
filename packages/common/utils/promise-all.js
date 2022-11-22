const promiseGetAll = require("./promise-get-all")

module.exports = async function promiseAll(promises) {
  const { values, errors } = await promiseGetAll(promises)
  if (errors.length) {
    throw new AggregateError(errors)
  }
  return values
}
