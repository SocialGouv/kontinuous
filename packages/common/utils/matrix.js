module.exports = (obj = {}) => {
  const result = []
  const entries = Object.entries(obj)
  for (const [key, list] of entries) {
    for (const val of list) {
      const output = {}
      output[key] = val
      for (const [skey, slist] of entries) {
        if (key === skey) {
          continue
        }
        for (const sval of slist) {
          output[skey] = sval
        }
      }
      result.push(output)
    }
  }
  return result
}
