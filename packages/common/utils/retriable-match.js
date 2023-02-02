module.exports = (err, errorsMapping) => {
  const errorMessage = err.message
  const matching = errorsMapping.find(
    (m) =>
      (m.includes && errorMessage.includes(m.includes)) ||
      (m.regex && m.regex.test(errorMessage))
  )
  if (matching && typeof matching.message === "function") {
    matching.message = matching.message({ error: err })
  }
  return {
    retry: !!matching,
    ...(matching || {}),
  }
}
