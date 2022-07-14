const findAliasOf = async (key, dependencies, subValues, scope = []) => {
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

module.exports = async (values, _options, context) => {
  const { config } = context
  for (const [key, val] of Object.entries(values)) {
    if (key === "global" && key === "project") {
      continue
    }
    if (val._chart) {
      continue
    }
    const scope = await findAliasOf(
      key,
      {
        project: { dependencies: config.dependencies },
      },
      values
    )
    if (scope) {
      val._chart = scope.join(".")
    }
  }
  return values
}
