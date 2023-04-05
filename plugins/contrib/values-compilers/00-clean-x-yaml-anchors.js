// allow x-* convention for yaml anchors, docker-compose like convention
// see https://stackoverflow.com/a/58328162/5338073
// and https://medium.com/@kinghuang/docker-compose-anchors-aliases-extensions-a1e4105d70bd
module.exports = async (values, _options, _context) => {
  for (const key of Object.keys(values)) {
    if (key.startsWith("x-")) {
      delete values[key]
    }
  }
  return values
}
