const componentTreeInfos = require("./infos/component-tree-infos")
const dependenciesTreeInfos = require("./infos/dependencies-tree-infos")

module.exports = async (manifests, _values) => {
  await componentTreeInfos(manifests)
  await dependenciesTreeInfos(manifests)
}
