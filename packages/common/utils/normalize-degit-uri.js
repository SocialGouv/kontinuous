module.exports = (uri) => {
  if (!uri.includes("@")) {
    return uri
  }
  let parsing = uri
  const protocolSepIndex = parsing.indexOf("://")
  if (protocolSepIndex !== -1) {
    parsing = parsing.slice(protocolSepIndex + 3)
  }
  const parts = parsing.split("@")
  if (parts.length === 2) {
    if (parts[0].includes("/")) {
      return uri.replaceAll("@", "#")
    }
    return uri
  }
  const lastIndex = uri.lastIndexOf("@")

  return `${uri.substring(0, lastIndex)}#${uri.substring(lastIndex + 1)}`
}
