const renderTplRecurse = async (values, context, rootValues = values) => {
  if (typeof values !== "object" || values === null) {
    return
  }
  const { config, utils } = context
  const { renderTpl, yaml } = utils
  const { buildPath } = config

  for (const key of Object.keys(values)) {
    const isTplCast = key.startsWith("~tpl:")
    if (key.startsWith("~tpl~") || isTplCast) {
      const tpl = values[key]
      delete values[key]
      const prefix = isTplCast ? `~${key.split("~").slice(1, 2)}~` : "~tpl~"
      const newKey = key.slice(prefix.length)
      let value = await renderTpl(tpl, {
        dir: `${buildPath}/tpl`,
        values: rootValues,
      })
      value = yaml.loadValue(value)
      if (isTplCast) {
        const cast = prefix.slice(1, -1).split(":").slice(1)
        switch (cast) {
          case ("int", "integer"): {
            value = parseInt(value, 10)
            break
          }
          case ("bool", "boolean", "yaml", "json"): {
            value = yaml.load(value)
            break
          }
          case "string": {
            value = value.toString()
            break
          }
          default: {
            throw new Error(`Invalid type cast ${cast}`)
          }
        }
      }
      values[newKey] = value
    } else {
      await renderTplRecurse(values[key], context, rootValues)
    }
  }
}

module.exports = async (values, _options, context) => {
  await renderTplRecurse(values, context)
  return values
}
