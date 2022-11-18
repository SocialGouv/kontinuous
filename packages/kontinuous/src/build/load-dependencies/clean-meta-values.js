const cleanMetaValues = (values) => {
  if (typeof values !== "object" || values === null) {
    return
  }
  for (const key of Object.keys(values)) {
    if (key.startsWith("_")) {
      delete values[key]
    } else {
      cleanMetaValues(values[key])
    }
  }
}
module.exports = cleanMetaValues
