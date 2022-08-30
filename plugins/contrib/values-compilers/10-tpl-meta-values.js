const renderTplRecurse = async (values, context, rootValues = values) => {
  if (typeof values !== "object" || values === null) {
    return
  }
  const { config, utils } = context
  const { renderTpl } = utils
  const { buildPath } = config

  for (const key of Object.keys(values)) {
    if (key.startsWith("~tpl~")) {
      const tpl = values[key]
      delete values[key]
      const newKey = key.slice(5)
      values[newKey] = await renderTpl(tpl, {
        dir: `${buildPath}/tpl`,
        values: rootValues,
      })
    } else {
      await renderTplRecurse(values[key], context, rootValues)
    }
  }
}

module.exports = async (values, _options, context) => {
  await renderTplRecurse(values, context)
  return values
}
