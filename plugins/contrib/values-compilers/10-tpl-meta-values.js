const renderTplRecurse = async (
  values,
  context,
  recursiveContext = [],
  rootValues = values
) => {
  if (typeof values !== "object" || values === null) {
    return
  }
  const { config, utils, logger } = context
  const { renderTpl, yaml } = utils
  const { buildPath } = config

  for (const key of Object.keys(values)) {
    const isTplCast = key.startsWith("~tpl:")
    if (key.startsWith("~tpl~") || isTplCast) {
      const tpl = values[key]
      delete values[key]
      const prefix = isTplCast ? `~${key.split("~").slice(1, 2)}~` : "~tpl~"
      const newKey = key.slice(prefix.length)

      const extraValues = {
        kontinuous: {
          chart: recursiveContext.join("."),
          parentChart: recursiveContext.slice(0, -1).join("."),
          chartContext: recursiveContext,
        },
      }

      let value
      try {
        value = await renderTpl(tpl, {
          dir: `${buildPath}/tpl`,
          values: {
            ...rootValues,
            ...extraValues,
          },
        })
      } catch (error) {
        logger.warn(`failed to render tpl key "${key}", value is "${tpl}"`)
        throw error
      }
      value = yaml.loadValue(value)
      if (isTplCast) {
        const cast = prefix.slice(1, -1).split(":").slice(1)
        switch (true) {
          case cast === "int" || cast === "integer": {
            value = parseInt(value, 10)
            break
          }
          case cast === "bool" ||
            cast === "boolean" ||
            cast === "yaml" ||
            cast === "json": {
            value = yaml.load(value)
            break
          }
          case cast === "string": {
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
      await renderTplRecurse(
        values[key],
        context,
        [...recursiveContext, key],
        rootValues
      )
    }
  }
}

module.exports = async (values, _options, context) => {
  await renderTplRecurse(values, context)
  return values
}
