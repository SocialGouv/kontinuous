module.exports = (processors) => async (data, _options, context, scope) => {
  if (!Array.isArray(processors)) {
    processors = [processors]
  }
  for (const inc of processors) {
    data = await context.require(inc, scope)(data)
  }
  return data
}
