module.exports = (mixed, options = {}) => {
  if (Array.isArray(mixed)) {
    return mixed
  }
  if (mixed === undefined || mixed === null || mixed === "") {
    return []
  }
  if (typeof mixed === "string") {
    const { json = true } = options
    if (json && mixed.startsWith("[")) {
      return JSON.parse(mixed)
    }
    let { separator = "," } = options
    if (separator) {
      if (Array.isArray(separator)) {
        separator = separator.find((sep) => mixed.includes(sep))
      }
      if (separator) {
        return mixed.split(separator)
      }
    }
  }
  return [mixed]
}
