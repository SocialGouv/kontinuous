module.exports = (str, prefix) => {
  if (str.startsWith(prefix)) {
    str = str.slice(prefix.length)
  }
  return str
}
