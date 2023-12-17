const renderTplRecurse = async (
  values,
  context,
  recursiveContext = [],
  chartValues = values,
  parentValues = values,
  rootValues = values
) => {
  if (typeof values !== "object" || values === null) {
    return
  }
  const { config, utils, logger } = context
  const { renderTpl, yaml } = utils
  const { buildPath } = config

  if (values._isChartValues) {
    chartValues = values
    parentValues = { ...values, Parent: parentValues }
  }

  for (const key of Object.keys(values)) {
    if (key.startsWith("_")) {
      continue
    }
    const isTplCast = key.startsWith("~tpl:")
    if (key.startsWith("~tpl~") || isTplCast) {
      const tpl = values[key]
      delete values[key]
      const prefix = isTplCast ? `~${key.split("~").slice(1, 2)}~` : "~tpl~"
      const newKey = key.slice(prefix.length)

      let value
      try {
        value = await renderTpl(tpl, {
          dir: `${buildPath}/tpl`,
          values: {
            ...chartValues,
            global: rootValues.global || {},
            kontinuous: {
              chart: recursiveContext.join("."),
              parentChart: recursiveContext.slice(0, -1).join("."),
              chartContext: recursiveContext,
            },
            Parent: parentValues.Parent,
          },
        })
      } catch (error) {
        logger.warn(`failed to render tpl key "${key}", value is "${tpl}"`)
        throw error
      }
      value = yaml.loadValue(value)
      if (isTplCast) {
        const cast = prefix.slice(1, -1).split(":").slice(1).join("")
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
        chartValues,
        parentValues,
        rootValues
      )
    }
  }
}

module.exports = async (values, _options, context) => {
  await renderTplRecurse(values, context)
  return values
}
