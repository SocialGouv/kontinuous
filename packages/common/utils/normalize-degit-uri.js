const gitOrgaLowerCase = (uri) => {
  const match =
    /^(?:(?:https:\/\/)?([^:/]+\.[^:/]+)\/|git@([^:/]+)[:/]|([^/]+):)?([^/\s]+)\/([^/\s#]+)(?:((?:\/[^/\s#]+)+))?(?:\/)?(?:#(.+))?/.exec(
      uri
    )
  if (!match) {
    return uri
  }
  const site = match[1] || match[2] || match[3]
  const user = match[4].toLowerCase()
  const name = match[5]
  const subdir = match[6] || ""
  const ref = match[7] ? `#${match[7]}` : ""
  return `${site ? `${site}/` : ""}${user}/${name}${subdir}${ref}`
}

const normalizeRefToHash = (uri) => {
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

module.exports = (uri) => {
  if (uri.includes("@")) {
    uri = normalizeRefToHash(uri)
  }
  uri = gitOrgaLowerCase(uri)
  return uri
}
