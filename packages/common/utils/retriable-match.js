module.exports = (err, errorsMapping) => {
  const errorMessage = err.message
  const matching = errorsMapping.find(
    (m) =>
      (m.includes && errorMessage.includes(m.includes)) ||
      (m.regex && m.regex.test(errorMessage))
  )
  return {
    retry: !!matching,
    ...(matching || {}),
  }
}
