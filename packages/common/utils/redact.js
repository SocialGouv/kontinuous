module.exports = (
  message,
  {
    secrets = [],
    hideCharsCount = false,
    stringSubstition = "***",
    repeatCharSubstition = "*",
    skipNotString = true,
  }
) => {
  if (skipNotString && typeof message !== "string") {
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
