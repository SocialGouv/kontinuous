module.exports = function removeNulls(obj) {
  const isArray = obj instanceof Array
  for (const k in obj) {
    if (obj[k] === null) {
      if (isArray) {
        obj.splice(k, 1)
      } else {
        delete obj[k]
      }
    } else if (typeof obj[k] === "object") {
      removeNulls(obj[k])
    }
  }
}
