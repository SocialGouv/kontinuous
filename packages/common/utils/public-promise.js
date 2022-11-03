module.exports = () => {
  let resolvePromise
  let rejectPromise
  const result = {}
  const promise = new Promise((res, rej) => {
    resolvePromise = res
    rejectPromise = rej
  })
  const resolve = (...args) => {
    result.ended = true
    result.resolved = true
    return resolvePromise(...args)
  }
  const reject = (...args) => {
    result.ended = true
    result.rejected = true
    return rejectPromise(...args)
  }
  result.promise = promise
  result.resolve = resolve
  result.reject = reject
  return result
}
