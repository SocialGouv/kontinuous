module.exports = async (values, config) => {
  const findAliasOf = async (
    key,
    dependencies = { project: { dependencies: config.dependencies } },
    subValues = values,
    scope = []
  ) => {
    for (const ck of Object.keys(dependencies)) {
      for (const vk of Object.keys(subValues[ck])) {
        if (vk === key || key.startsWith(`${vk}-`)) {
          return [...scope, ck, vk]
        }
      }
      const found = await findAliasOf(
        key,
        dependencies[ck].dependencies || {},
        subValues[ck],
        [...scope, ck]
      )
      if (found) {
        return found
      }
    }
  }

  for (const [key, val] of Object.entries(values)) {
    if (key === "global" && key === "project") {
      continue
    }
    if (val._aliasOf) {
      continue
    }
    const scope = await findAliasOf(key)
    if (scope) {
      val._aliasOf = scope.join(".")
    }
  }
  return values
}
