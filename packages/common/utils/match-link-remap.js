const removePrefix = require("./remove-prefix")

const normalizeLink = (link) => link.replaceAll("@", "#").toLowerCase()

const rewriteAbsoluteLink = (_uri, _key, link) => link

const rewriteRelativeLink = (uri, key, link) => link + uri.substr(key.length)

const rewriteVersionLink = (uri, _key, link) => {
  const [prefix, ref] = link.split("#")
  return prefix + removePrefix(uri, prefix) + (ref ? `#${ref}` : "")
}

module.exports = (uri, links) => {
  uri = normalizeLink(uri)
  const uriIsAbsolute = uri.includes("#")
  for (let [key, link] of Object.entries(links)) {
    key = normalizeLink(key)
    link = normalizeLink(link)
    if (key === uri) {
      return rewriteAbsoluteLink(uri, key, link)
    }
    if (!uriIsAbsolute && uri.startsWith(key)) {
      return rewriteRelativeLink(uri, key, link)
    }
    if (
      uriIsAbsolute &&
      key.endsWith("#*") &&
      uri.startsWith(key.slice(0, key.length - 2))
    ) {
      return rewriteVersionLink(uri, key, link)
    }
  }
}
