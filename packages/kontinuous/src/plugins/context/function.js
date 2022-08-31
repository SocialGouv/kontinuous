module.exports = (processors) => async (data, _options, context, scope) => {
  for (const inc of processors) {
    data = await context.require(inc, scope)(data)
  }
  return data
}
