module.exports = function flattenObject(
  obj,
  options = {},
  target = {},
  flattenedKey = undefined
) {
  const { separator = ".", keyTransform } = options
  for (const [key, value] of Object.entries(obj)) {
    let newKey
    if (flattenedKey === undefined) {
      newKey = key
    } else {
      newKey = flattenedKey + separator + key
    }

    if (typeof value === "object" && value !== null) {
      flattenObject(value, options, target, newKey)
    } else {
      if (keyTransform) {
        newKey = keyTransform(newKey)
      }
      target[newKey] = value
    }
  }
  return target
}
