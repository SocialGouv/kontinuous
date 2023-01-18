module.exports =
  (processors, parallel = false) =>
  async (...args) => {
    if (!Array.isArray(processors)) {
      processors = [processors]
    }

    if (parallel) {
      const [_options, context, scope] = args
      return Promise.all(
        processors.map((inc) => context.require(inc, scope)(null, true))
      )
    }

    const [_data, _options, context, scope] = args
    let [data] = args
    for (const inc of processors) {
      data = await context.require(inc, scope)(data)
    }
    return data
  }
