const filterManifestDefRecurse = (def) => {
  if (typeof def !== "object" || def === null) {
    return
  }
  for (const key of Object.keys(def)) {
    if (key.startsWith("~")) {
      delete def[key]
    } else {
      filterManifestDefRecurse(def[key])
    }
  }
}

module.exports = async (manifests, _options, context) =>
  filterManifestDefRecurse(manifests, context)
