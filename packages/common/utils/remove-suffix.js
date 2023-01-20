module.exports = (str, suffix) => {
  if (str.endsWith(suffix)) {
    str = str.slice(0, str.length - suffix.length)
  }
  return str
}
