module.exports = (
  message,
  {
    secrets = [],
    hideCharsCount = false,
    stringSubstition = "***",
    repeatCharSubstition = "*",
  }
) => {
  if (!message) {
    return message
  }
  for (const secret of secrets) {
    message = message.replaceAll(
      secret,
      hideCharsCount
        ? stringSubstition
        : repeatCharSubstition.repeat(secret.length)
    )
  }
  return message
}
