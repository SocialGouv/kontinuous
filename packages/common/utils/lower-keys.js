module.exports = (obj) =>
  Object.entries(obj).reduce((o, [key, value]) => {
    o[key.toLowerCase()] = value
    return o
  }, {})
