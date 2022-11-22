module.exports = async function promiseGetAll(promises) {
  const results = await Promise.allSettled(promises)
  const values = []
  const errors = []

  for (const result of results) {
    if (result.status === "rejected") {
      let { reason } = result
      if (!(reason instanceof Error)) {
        reason = new Error(reason)
      }
      errors.push(result.reason)
    } else {
      values.push(result.value)
    }
  }

  return { values, errors }
}
